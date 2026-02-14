import express from "express";
import { MongoClient, ObjectId } from "mongodb";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Validate environment variable
if (!process.env.MONGO_URI) {
  console.error("❌ ERROR: MONGO_URI not set in environment");
  process.exit(1);
}

const uri = process.env.MONGO_URI;
let client;
let db;

// Extract database name from connection string
function getDbNameFromUri(uri) {
  const match = uri.match(/\/([^/?]+)(?:\?|$)/);
  return match ? match[1] : 'test';
}

// Connect to MongoDB
async function connectDB() {
  try {
    client = new MongoClient(uri);
    await client.connect();
    
    const dbName = getDbNameFromUri(uri);
    db = client.db(dbName);
    
    console.log(`✅ Connected to MongoDB`);
    console.log(`📊 Using database: ${dbName}`);
    
    return true;
  } catch (error) {
    console.error("❌ MongoDB connection error:", error.message);
    return false;
  }
}

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    await db.command({ ping: 1 });
    res.status(200).json({ 
      status: "healthy", 
      timestamp: new Date().toISOString(),
      database: "connected"
    });
  } catch (error) {
    res.status(503).json({ 
      status: "unhealthy", 
      timestamp: new Date().toISOString(),
      database: "disconnected",
      error: error.message 
    });
  }
});

// CREATE - Add new task
app.post("/api/items", async (req, res) => {
  try {
    const { name, description, color, category, priority, status } = req.body;
    
    if (!name) {
      return res.status(400).json({ 
        error: "Task title is required" 
      });
    }

    const newItem = {
      name,
      description: description || "",
      color: color || getRandomColor(),
      category: category || "work",
      priority: priority || "medium",
      status: status || "not-started",
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection("items").insertOne(newItem);
    
    console.log(`📝 Created task: ${result.insertedId}`);
    
    res.status(201).json({
      message: "Task created successfully",
      item: { _id: result.insertedId, ...newItem },
      success: true
    });
  } catch (error) {
    console.error("❌ Create error:", error);
    res.status(500).json({ 
      error: "Failed to create task",
      details: error.message 
    });
  }
});

// READ - Get all tasks
app.get("/api/items", async (req, res) => {
  try {
    const { category, search, status } = req.query;
    let query = {};
    
    if (category && category !== 'all') {
      query.category = category;
    }
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } }
      ];
    }

    const items = await db.collection("items")
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();
    
    const count = await db.collection("items").countDocuments();
    console.log(`📊 Retrieved ${items.length} tasks (Total: ${count})`);
    
    res.json({
      items,
      count: items.length,
      total: count,
      success: true
    });
  } catch (error) {
    console.error("❌ Read error:", error);
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
});

// READ - Get single task by ID
app.get("/api/items/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid task ID" });
    }

    const item = await db.collection("items").findOne({ 
      _id: new ObjectId(id) 
    });

    if (!item) {
      return res.status(404).json({ error: "Task not found" });
    }

    res.json({ item, success: true });
  } catch (error) {
    console.error("❌ Read single error:", error);
    res.status(500).json({ error: "Failed to fetch task" });
  }
});

// UPDATE - Update task
app.put("/api/items/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid task ID" });
    }

    // Remove immutable fields
    delete updates._id;
    delete updates.createdAt;
    
    updates.updatedAt = new Date();
    
    // Handle completion timestamp
    if (updates.status === 'completed' && !updates.completedAt) {
      updates.completedAt = new Date();
    } else if (updates.status !== 'completed') {
      updates.completedAt = null;
    }

    const result = await db.collection("items").updateOne(
      { _id: new ObjectId(id) },
      { $set: updates }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Task not found" });
    }

    const updatedItem = await db.collection("items").findOne({ 
      _id: new ObjectId(id) 
    });

    console.log(`✏️ Updated task: ${id}`);
    
    res.json({
      message: "Task updated successfully",
      item: updatedItem,
      success: true
    });
  } catch (error) {
    console.error("❌ Update error:", error);
    res.status(500).json({ error: "Failed to update task" });
  }
});

// DELETE - Remove task
app.delete("/api/items/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid task ID" });
    }

    const result = await db.collection("items").deleteOne({ 
      _id: new ObjectId(id) 
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Task not found" });
    }

    console.log(`🗑️ Deleted task: ${id}`);
    
    res.json({
      message: "Task deleted successfully",
      success: true
    });
  } catch (error) {
    console.error("❌ Delete error:", error);
    res.status(500).json({ error: "Failed to delete task" });
  }
});

// Stats endpoint
app.get("/api/stats", async (req, res) => {
  try {
    // Get tasks stats
    const totalItems = await db.collection("items").countDocuments();
    
    // Category stats
    const categories = await db.collection("items").aggregate([
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]).toArray();
    
    // Priority stats
    const priorityStats = await db.collection("items").aggregate([
      { $group: { _id: "$priority", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]).toArray();
    
    // Status stats
    const statusStats = await db.collection("items").aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]).toArray();
    
    console.log(`📈 Stats requested`);
    
    res.json({
      totalItems,
      categories,
      priorityStats,
      statusStats,
      success: true
    });
  } catch (error) {
    console.error("❌ Stats error:", error);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

// Initialize endpoint
app.post("/api/init", async (req, res) => {
  try {
    const count = await db.collection("items").countDocuments();
    
    if (count === 0) {
      const sampleTasks = [
        {
          name: "Welcome to TaskFlow!",
          description: "This is your first task. You can edit or delete it.",
          color: "#6366f1",
          category: "work",
          priority: "medium",
          status: "not-started",
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          name: "Plan weekly goals",
          description: "Set objectives for the upcoming week",
          color: "#10b981",
          category: "personal",
          priority: "high",
          status: "in-progress",
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          name: "Grocery shopping",
          description: "Milk, eggs, bread, fruits, and vegetables",
          color: "#f59e0b",
          category: "shopping",
          priority: "low",
          status: "completed",
          completedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          name: "Learn Kubernetes basics",
          description: "Complete the Kubernetes fundamentals course",
          color: "#8b5cf6",
          category: "learning",
          priority: "medium",
          status: "in-progress",
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];
      
      await db.collection("items").insertMany(sampleTasks);
      console.log("✅ Added sample tasks");
    }
    
    res.json({
      message: "Database initialized successfully",
      tasksCount: count,
      success: true
    });
  } catch (error) {
    console.error("❌ Init error:", error);
    res.status(500).json({ error: "Failed to initialize database" });
  }
});

// Helper function for random colors
function getRandomColor() {
  const colors = [
    "#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
    "#3b82f6", "#ec4899", "#14b8a6", "#f97316", "#64748b"
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

// Connect to DB and start server
connectDB().then((connected) => {
  if (connected) {
    app.listen(port, '0.0.0.0', () => {
      console.log(`
╔════════════════════════════════════════════════════════╗
║    🚀 TaskFlow API Started!                           ║
╠════════════════════════════════════════════════════════╣
║   Port:     ${port}                                    ║
║   Database: ${getDbNameFromUri(uri)}                   ║
║   Mode:     ${process.env.NODE_ENV || 'development'}   ║
╠════════════════════════════════════════════════════════╣
║   📍 Endpoints:                                        ║
║   GET    /health           - Health check              ║
║   GET    /api/items        - List all tasks            ║
║   POST   /api/items        - Create new task           ║
║   GET    /api/items/:id    - Get single task           ║
║   PUT    /api/items/:id    - Update task               ║
║   DELETE /api/items/:id    - Delete task               ║
║   GET    /api/stats        - Get statistics            ║
║   POST   /api/init         - Initialize DB             ║
╚════════════════════════════════════════════════════════╝
      `);
    });
  } else {
    console.error("❌ Failed to connect to database. Exiting.");
    process.exit(1);
  }
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("🔻 SIGTERM received. Closing MongoDB connection...");
  if (client) {
    await client.close();
    console.log("✅ MongoDB connection closed");
  }
  process.exit(0);
});