import { describe, it, expect, beforeEach } from "vitest";
import { KnowledgeGraph } from "./KnowledgeGraph.js";
import { NodeType, EdgeType, GraphEvent } from "./types.js";

describe("KnowledgeGraph", () => {
  let graph: KnowledgeGraph;

  beforeEach(() => {
    graph = new KnowledgeGraph();
    // The constructor calls seed(), but we want a clean state for some tests
    graph.clear();
  });

  it("should add a node correctly", () => {
    const node = graph.addNode({
      id: "test-node",
      type: NodeType.Concept,
      label: "Test Node",
      properties: { foo: "bar" },
    });

    expect(node.id).toBe("test-node");
    expect(node.label).toBe("Test Node");
    expect(graph.hasNode("test-node")).toBe(true);
    expect(graph.getNode("test-node")).toEqual(node);
  });

  it("should update a node correctly", () => {
    graph.addNode({
      id: "test-node",
      type: NodeType.Concept,
      label: "Initial Label",
    });

    const updated = graph.updateNode("test-node", { label: "Updated Label" });
    expect(updated.label).toBe("Updated Label");
    expect(updated.metadata.version).toBe(2);
    expect(graph.getNode("test-node")?.label).toBe("Updated Label");
  });

  it("should remove a node and its incident edges", () => {
    graph.addNode({ id: "n1", type: NodeType.Concept, label: "N1" });
    graph.addNode({ id: "n2", type: NodeType.Concept, label: "N2" });
    graph.addEdge({
      source: "n1",
      target: "n2",
      type: EdgeType.RELATED_TO,
      weight: 1.0,
    });

    expect(graph.getNodes().length).toBe(2);
    expect(graph.getEdges().length).toBe(1);

    graph.removeNode("n1");

    expect(graph.hasNode("n1")).toBe(false);
    expect(graph.getEdges().length).toBe(0);
  });

  it("should add an edge correctly", () => {
    graph.addNode({ id: "n1", type: NodeType.Concept, label: "N1" });
    graph.addNode({ id: "n2", type: NodeType.Concept, label: "N2" });

    const edge = graph.addEdge({
      source: "n1",
      target: "n2",
      type: EdgeType.RELATED_TO,
      weight: 0.5,
    });

    expect(edge.source).toBe("n1");
    expect(edge.target).toBe("n2");
    expect(graph.hasEdge(edge.id)).toBe(true);
    expect(graph.getOutDegree("n1")).toBe(1);
    expect(graph.getInDegree("n2")).toBe(1);
  });

  it("should compute stats correctly", () => {
    graph.addNode({ id: "n1", type: NodeType.Concept, label: "N1" });
    graph.addNode({ id: "n2", type: NodeType.Topic, label: "N2" });
    graph.addEdge({
      source: "n1",
      target: "n2",
      type: EdgeType.PART_OF,
      weight: 1.0,
    });

    const stats = graph.getStats();
    expect(stats.nodeCount).toBe(2);
    expect(stats.edgeCount).toBe(1);
    expect(stats.nodesByType[NodeType.Concept]).toBe(1);
    expect(stats.nodesByType[NodeType.Topic]).toBe(1);
  });

  it("should seed correctly", () => {
    const newGraph = new KnowledgeGraph(); // This calls seed()
    const stats = newGraph.getStats();
    expect(stats.nodeCount).toBeGreaterThan(0);
    expect(stats.edgeCount).toBeGreaterThan(0);
  });

  it("should emit events", () => {
    const addedNodes: any[] = [];
    graph.on(GraphEvent.NodeAdded, (node) => addedNodes.push(node));

    graph.addNode({ id: "test-event", type: NodeType.Concept, label: "Event" });
    expect(addedNodes.length).toBe(1);
    expect(addedNodes[0].id).toBe("test-event");
  });
});
