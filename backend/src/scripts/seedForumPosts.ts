import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import Post, { IPost } from "../models/Post.model";
import Comment from "../models/Comment.model";
import User from "../models/User.model";
import winston from "winston";

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(
      ({ timestamp, level, message }) =>
        `${timestamp} [${level.toUpperCase()}] ${message}`,
    ),
  ),
  transports: [new winston.transports.Console()],
});

interface SeedUser {
  email: string;
  username: string;
}

interface SeedComment {
  content: string;
  author: SeedUser;
}

interface SeedPost {
  title: string;
  content: string;
  category: string;
  author?: SeedUser;
  comments?: SeedComment[];
}

/**
 * Seed posts for the forum.
 * These are meaningful posts to populate the forum on first load.
 */
const DEFAULT_POST_AUTHOR: SeedUser = {
  email: "system@estatewise.com",
  username: "EstateWise Team",
};

const seedPosts: SeedPost[] = [
  {
    title: "Welcome to the EstateWise Community!",
    content:
      "Hello everyone! Welcome to our real estate discussion forum. This is a space where you can discuss properties, neighborhoods, market trends, and share your experiences. Feel free to ask questions, share insights, and connect with fellow real estate enthusiasts. Let's build a helpful and supportive community together!",
    category: "General",
    author: DEFAULT_POST_AUTHOR,
    comments: [
      {
        content:
          "Thrilled to have everyone here. If you are new, check the pinned market FAQs—we update them every Monday.",
        author: {
          email: "insights@estatewise.com",
          username: "Market Insights Lead",
        },
      },
      {
        content:
          "Excited to connect with fellow investors. Tag me if you want feedback on rental strategies or cash flow models.",
        author: {
          email: "investor@estatewise.com",
          username: "Investor Ally",
        },
      },
    ],
  },
  {
    title: "Best Neighborhoods for Families in 2025",
    content:
      "I'm looking for recommendations on family-friendly neighborhoods. What areas do you think offer the best schools, parks, and community amenities? I'm particularly interested in areas with good walkability and low crime rates. Any personal experiences would be greatly appreciated!",
    category: "Neighborhoods",
    author: {
      email: "advisor@estatewise.com",
      username: "Neighborhood Advisor",
    },
    comments: [
      {
        content:
          "We have a new dataset on school ratings—try filtering by districts with walkability scores above 70. That surfaced some hidden gems for my clients.",
        author: DEFAULT_POST_AUTHOR,
      },
      {
        content:
          "Consider commute times too. Areas near multi-line transit hubs usually balance safety, parks, and easier city access.",
        author: {
          email: "commuter@estatewise.com",
          username: "Commuter Consultant",
        },
      },
    ],
  },
  {
    title: "First-Time Home Buyer Tips and Tricks",
    content:
      "As a first-time home buyer, the process can feel overwhelming. I wanted to start a thread where we can share tips, mistakes to avoid, and resources that helped us through the journey. What do you wish you knew before buying your first home? Let's help each other navigate this exciting milestone!",
    category: "Advice",
    author: {
      email: "guide@estatewise.com",
      username: "First-Time Buyer Guide",
    },
    comments: [
      {
        content:
          "Start with a realistic maintenance budget—unexpected repairs pop up fast. I set aside 1% of the purchase price annually.",
        author: {
          email: "designer@estatewise.com",
          username: "Home Design Expert",
        },
      },
      {
        content:
          "Great thread! We also have a downloadable checklist in the resources tab that covers lender questions and inspection prep.",
        author: DEFAULT_POST_AUTHOR,
      },
    ],
  },
  {
    title: "Market Trends: Are We in a Buyer's or Seller's Market?",
    content:
      "With recent economic changes and fluctuating interest rates, I'm curious about current market conditions. What are you seeing in your local areas? Are prices still climbing, or are we seeing a shift? Share your insights and data if you have any. Understanding the market is crucial for making informed decisions.",
    category: "Market Analysis",
    author: {
      email: "insights@estatewise.com",
      username: "Market Insights Lead",
    },
    comments: [
      {
        content:
          "In the Midwest we are seeing inventory up 12% month over month, which is softening list-to-sale ratios.",
        author: {
          email: "advisor@estatewise.com",
          username: "Neighborhood Advisor",
        },
      },
      {
        content:
          "West coast condos still lean seller-friendly. I'm tracking median DOM at 18 days, which is historically low.",
        author: {
          email: "investor@estatewise.com",
          username: "Investor Ally",
        },
      },
    ],
  },
  {
    title: "Renovations That Actually Increase Home Value",
    content:
      "Thinking about renovating before selling? Let's discuss which home improvements offer the best ROI. From kitchen remodels to landscaping, what renovations have you found to truly increase property value? I'm looking for both budget-friendly and high-end options. Share your before-and-after stories!",
    category: "Home Improvement",
    author: {
      email: "designer@estatewise.com",
      username: "Home Design Expert",
    },
    comments: [
      {
        content:
          "Energy-efficient windows have been a win for my sellers—buyers like the utility savings and appraisers notice.",
        author: {
          email: "greenliving@estatewise.com",
          username: "Sustainability Coach",
        },
      },
      {
        content:
          "Don't forget curb appeal. Fresh paint and native landscaping almost always pay for themselves.",
        author: DEFAULT_POST_AUTHOR,
      },
    ],
  },
  {
    title: "Remote Work and Its Impact on Real Estate Decisions",
    content:
      "How has the shift to remote work influenced your housing choices? Are you considering moving to a different city or state for better quality of life and lower costs? I've noticed more people prioritizing home office spaces and outdoor areas. What factors are most important to you now that remote work is more common?",
    category: "Lifestyle",
    author: {
      email: "remote@estatewise.com",
      username: "Remote Work Nomad",
    },
    comments: [
      {
        content:
          "Dedicated office space is now a top search filter. Listings that stage dual offices get 15% more saves on our platform.",
        author: DEFAULT_POST_AUTHOR,
      },
    ],
  },
  {
    title: "Investment Properties: What to Look For",
    content:
      "For those interested in real estate investment, what criteria do you use when evaluating potential rental properties? Cash flow, appreciation potential, location, tenant demographics - what matters most? I'd love to hear from experienced investors about red flags to avoid and green lights to pursue.",
    category: "Investment",
    author: {
      email: "investor@estatewise.com",
      username: "Investor Ally",
    },
    comments: [
      {
        content:
          "I focus on tenant retention. Areas with stable employers and access to transit cut vacancy swings dramatically.",
        author: {
          email: "commuter@estatewise.com",
          username: "Commuter Consultant",
        },
      },
      {
        content:
          "Cash-on-cash above 7% is my baseline. The insights dashboard can model this if you plug in HOA and tax data.",
        author: DEFAULT_POST_AUTHOR,
      },
    ],
  },
  {
    title: "Commute vs. Community: Finding the Right Balance",
    content:
      "One of the biggest trade-offs in choosing a home is commute time versus community features. How do you prioritize? Would you rather live closer to work or in a neighborhood with better amenities, even if it means a longer commute? With our commute analysis tool, you can explore different scenarios - share what factors matter most to you!",
    category: "Lifestyle",
    author: {
      email: "commuter@estatewise.com",
      username: "Commuter Consultant",
    },
    comments: [
      {
        content:
          "I compromise at 35 minutes door-to-door. Beyond that, I start to trade errands and social time for transit.",
        author: {
          email: "remote@estatewise.com",
          username: "Remote Work Nomad",
        },
      },
    ],
  },
  {
    title: "Sustainability in Real Estate: Green Homes and Energy Efficiency",
    content:
      "Interested in eco-friendly living? Let's discuss sustainable home features like solar panels, energy-efficient appliances, and green building materials. Are these features worth the investment? Do they significantly impact utility costs and resale value? Share your experiences with green homes and sustainable living practices.",
    category: "Sustainability",
    author: {
      email: "greenliving@estatewise.com",
      username: "Sustainability Coach",
    },
    comments: [
      {
        content:
          "Buyers respond to transparent utility bills. If you have historic usage data, bring it to showings—it builds trust.",
        author: DEFAULT_POST_AUTHOR,
      },
      {
        content:
          "Heat pumps plus smart thermostats have cut my operating expenses by 18% year over year.",
        author: {
          email: "advisor@estatewise.com",
          username: "Neighborhood Advisor",
        },
      },
    ],
  },
  {
    title: "How Do You Evaluate Flood Risk for a Property?",
    content:
      "Flood zones are confusing to me. What tools or data sources do you trust when evaluating flood risk? Do you only look at FEMA maps, or do you use other sources too? I'd love a step-by-step approach that helps buyers make an informed call.",
    category: "Advice",
    author: {
      email: "risk@estatewise.com",
      username: "Risk Analyst",
    },
    comments: [
      {
        content:
          "Start with FEMA but cross-check with local GIS portals. Some cities publish historical flood incident layers that are more detailed.",
        author: {
          email: "insights@estatewise.com",
          username: "Market Insights Lead",
        },
      },
      {
        content:
          "Also check elevation changes within a 2-3 block radius. A single low spot can flip the whole property's risk profile.",
        author: {
          email: "advisor@estatewise.com",
          username: "Neighborhood Advisor",
        },
      },
    ],
  },
  {
    title: "HOA Fees: When Do They Make Sense?",
    content:
      "I'm comparing condos with higher HOA fees against townhomes with minimal fees. How do you decide if the HOA cost is worth it? What amenities or services justify the price?",
    category: "Investment",
    author: {
      email: "numbers@estatewise.com",
      username: "HOA Cost Tracker",
    },
    comments: [
      {
        content:
          "I normalize by square footage and compare the included services. If the fee covers roof, exterior, and insurance, it can be a solid tradeoff.",
        author: {
          email: "investor@estatewise.com",
          username: "Investor Ally",
        },
      },
      {
        content:
          "Ask for the reserve study. Underfunded reserves now mean special assessments later.",
        author: DEFAULT_POST_AUTHOR,
      },
    ],
  },
  {
    title: "Seasonality: Best Months to Buy or Sell",
    content:
      "Do you see meaningful seasonal pricing changes in your market? I'm trying to time a purchase and wondering if waiting for winter really makes a difference. Share the months you think are most buyer-friendly.",
    category: "Market Analysis",
    author: {
      email: "analytics@estatewise.com",
      username: "Seasonality Analyst",
    },
    comments: [
      {
        content:
          "Inventory dips in December but competition does too. If you are flexible on selection, late winter can be a strong negotiating window.",
        author: {
          email: "advisor@estatewise.com",
          username: "Neighborhood Advisor",
        },
      },
      {
        content:
          "Spring is when listings spike. Pricing can run hotter, but you get more options and faster inspections.",
        author: DEFAULT_POST_AUTHOR,
      },
    ],
  },
  {
    title: "What Should Be in a Rental Lease Addendum?",
    content:
      "For landlords: what addendums do you always include in a lease? I'm thinking about pets, maintenance response times, and smart-home device access. Would love a checklist.",
    category: "Investment",
    author: {
      email: "landlord@estatewise.com",
      username: "Landlord Partner",
    },
    comments: [
      {
        content:
          "Spell out appliance responsibilities and filter replacement schedules. It reduces friction when maintenance requests come in.",
        author: {
          email: "investor@estatewise.com",
          username: "Investor Ally",
        },
      },
      {
        content:
          "Pet addendums should clarify breed restrictions, pet rent, and liability coverage. Keep it simple and explicit.",
        author: {
          email: "advisor@estatewise.com",
          username: "Neighborhood Advisor",
        },
      },
    ],
  },
];

const seederCache = new Map<string, Awaited<ReturnType<typeof User.findOne>>>();

async function ensureSeederUser(profile: SeedUser) {
  if (seederCache.has(profile.email)) {
    return seederCache.get(profile.email)!;
  }

  let user = await User.findOne({ email: profile.email });
  if (!user) {
    const randomPassword = randomBytes(24).toString("hex");
    const hashedPassword = await bcrypt.hash(randomPassword, 10);
    user = new User({
      username: profile.username,
      email: profile.email,
      password: hashedPassword,
    });
    await user.save();
    logger.info(
      `👤 Created forum seeder user ${profile.username} (${profile.email})`,
    );
  }

  seederCache.set(profile.email, user);
  return user;
}

async function ensureCommentsForPost(
  post: IPost,
  comments: SeedComment[] | undefined,
) {
  if (!comments?.length) return 0;

  let createdCount = 0;

  for (const commentData of comments) {
    const authorProfile = commentData.author || DEFAULT_POST_AUTHOR;
    const author = await ensureSeederUser(authorProfile);

    const existingComment = await Comment.findOne({
      post: post._id,
      content: commentData.content,
    });
    if (existingComment) {
      continue;
    }

    const comment = new Comment({
      post: post._id,
      // @ts-ignore
      author: author._id,
      content: commentData.content,
      upvotes: [],
      downvotes: [],
    });
    await comment.save();
    createdCount++;
  }

  const totalComments = await Comment.countDocuments({ post: post._id });
  if (post.commentCount !== totalComments) {
    post.commentCount = totalComments;
    await post.save();
  }

  return createdCount;
}

/**
 * Exponential backoff retry logic for seeding.
 */
async function seedWithRetry(
  maxRetries: number = 5,
  initialDelay: number = 1000,
) {
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      logger.info(`🌱 Forum seeding attempt ${attempt + 1}/${maxRetries}...`);

      // Ensure seeder users exist
      const requiredSeederProfiles = new Map<string, SeedUser>();
      for (const postSeed of seedPosts) {
        const authorProfile = postSeed.author || DEFAULT_POST_AUTHOR;
        requiredSeederProfiles.set(authorProfile.email, authorProfile);
        postSeed.comments?.forEach((comment) => {
          requiredSeederProfiles.set(comment.author.email, comment.author);
        });
      }

      for (const profile of requiredSeederProfiles.values()) {
        await ensureSeederUser(profile);
      }

      const createdPosts: string[] = [];
      let totalCommentsCreated = 0;

      for (const postData of seedPosts) {
        const authorProfile = postData.author || DEFAULT_POST_AUTHOR;
        const author = await ensureSeederUser(authorProfile);

        // Check if this post already exists by title
        const existing = await Post.findOne({ title: postData.title });
        let postDoc: IPost;

        if (existing) {
          logger.info(`⏭️ Post "${postData.title}" already exists, skipping.`);
          continue;
        }

        const post = new Post({
          // @ts-ignore
          author: author._id,
          title: postData.title,
          content: postData.content,
          category: postData.category,
          upvotes: [],
          downvotes: [],
          commentCount: 0,
          viewCount: 0,
        });
        await post.save();
        createdPosts.push(postData.title);
        logger.info(`✅ Created post: "${postData.title}"`);
        postDoc = post;

        totalCommentsCreated += await ensureCommentsForPost(
          postDoc,
          postData.comments,
        );
      }

      logger.info(
        `🎉 Forum seeding complete. Posts created: ${createdPosts.length}. Comments created: ${totalCommentsCreated}.`,
      );
      return;
    } catch (err: any) {
      attempt++;
      const delay = initialDelay * Math.pow(2, attempt - 1);

      logger.error(`❌ Seeding attempt ${attempt} failed: ${err.message}`);

      if (attempt < maxRetries) {
        logger.info(
          `🔄 Retrying in ${delay}ms... (${maxRetries - attempt} attempts remaining)`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        logger.error(
          `💥 Failed to seed forum posts after ${maxRetries} attempts. Give up.`,
        );
      }
    }
  }
}

/**
 * Main entry point for seeding - runs non-blocking in the background.
 */
export async function runForumSeeding() {
  // Run seeding in the background without blocking
  setImmediate(async () => {
    try {
      await seedWithRetry(5, 2000);
    } catch (error: any) {
      logger.error(`Forum seeding error: ${error.message}`);
    }
  });

  logger.info("🚀 Forum seeding initiated in background...");
}

// If run directly as a script
if (require.main === module) {
  (async () => {
    const MONGO_URI = process.env.MONGO_URI || "";
    if (!MONGO_URI) {
      logger.error("MONGO_URI not set");
      process.exit(1);
    }

    await mongoose.connect(MONGO_URI);
    logger.info("Connected to MongoDB");

    await seedWithRetry(5, 2000);

    await mongoose.disconnect();
    logger.info("Disconnected from MongoDB");
    process.exit(0);
  })();
}
