import { useState } from "react";
import { gql, useMutation, useQuery, useSubscription } from "@apollo/client";

type WatchProperty = {
  propertyId: string;
  price: number;
};

interface WatchlistData {
  watchlist: WatchProperty[];
}

const WATCHLIST_QUERY = gql`
  query Watchlist {
    watchlist {
      propertyId
      price
    }
  }
`;

const ADD_TO_WATCHLIST = gql`
  mutation AddToWatchlist($propertyId: ID!) {
    addToWatchlist(propertyId: $propertyId) {
      propertyId
      price
    }
  }
`;

const PRICE_UPDATED = gql`
  subscription PriceUpdated($propertyId: ID!) {
    priceUpdated(propertyId: $propertyId) {
      propertyId
      price
    }
  }
`;

function PriceListener({ propertyId }: { propertyId: string }) {
  const { data } = useSubscription<{ priceUpdated: WatchProperty }>(
    PRICE_UPDATED,
    {
      variables: { propertyId },
    },
  );
  if (!data) return null;
  return (
    <span className="ml-2 text-sm text-green-600">
      Updated: ${data.priceUpdated.price}
    </span>
  );
}

export default function Watchlist() {
  const { data, refetch } = useQuery<WatchlistData>(WATCHLIST_QUERY);
  const [addToWatchlist] = useMutation<
    { addToWatchlist: WatchProperty },
    { propertyId: string }
  >(ADD_TO_WATCHLIST);
  const [id, setId] = useState("");

  const handleAdd = async () => {
    if (!id) return;
    await addToWatchlist({ variables: { propertyId: id } });
    setId("");
    refetch();
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl mb-4">Property Watchlist</h1>
      <div className="mb-4">
        <input
          className="border p-2 mr-2"
          placeholder="Property ID"
          value={id}
          onChange={(e) => setId(e.target.value)}
        />
        <button
          className="bg-blue-500 text-white px-4 py-2"
          onClick={handleAdd}
        >
          Add
        </button>
      </div>
      <ul>
        {data?.watchlist.map((p: WatchProperty) => (
          <li key={p.propertyId} className="mb-2">
            {p.propertyId}: ${p.price}
            <PriceListener propertyId={p.propertyId} />
          </li>
        ))}
      </ul>
    </div>
  );
}
