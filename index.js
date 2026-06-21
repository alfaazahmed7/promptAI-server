const express = require('express');
const dotenv = require('dotenv');
dotenv.config();
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');


const port = process.env.PORT;
const uri = process.env.MONGODB_URI;

const app = express();
app.use(cors());
app.use(express.json());


const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        await client.connect();

        const db = client.db('prompt-ai');
        const promptCollections = db.collection('prompts');
        const bookmarkCollections = db.collection('bookmarks');
        const reportsCollection = db.collection('reports');

        // all-prompts related APIs

        app.get('/api/prompts', async (req, res) => {
            try {
                const { search, category, aiTool, sort } = req.query;

                let query = {};

                // Case-insensitive regex search for title or tags
                if (search) {
                    query.$or = [
                        { title: { $regex: search, $options: 'i' } },
                        { tags: { $regex: search, $options: 'i' } }
                    ];
                }

                // Exact match filter for Category
                if (category) {
                    query.category = category;
                }

                // Exact match filter for AI Engine Tool
                if (aiTool) {
                    query.aiTool = aiTool;
                }

                // Build the MongoDB sorting object
                let sortOption = {};
                if (sort === 'popular') {
                    sortOption.copyCount = -1; // Highest copyCount first
                } else if (sort === 'alphabetical') {
                    sortOption.title = 1;     // Alphabetical order A-Z
                } else {
                    sortOption._id = -1;       // Default: 'latest' (Newest first using MongoDB ObjectId timestamp)
                }

                // Fetch the targeted records from MongoDB
                const result = await promptCollections
                    .find(query)
                    .sort(sortOption)
                    .toArray();

                res.json(result);
            }
            catch (error) {
                console.error("Error fetching prompts:", error);
                res.status(500).json({ error: "Internal Server Error" });
            }
        });

        app.get('/api/prompts/:id', async (req, res) => {
            const id = req.params.id;
            const query = {
                _id: new ObjectId(id)
            }
            const result = await promptCollections.findOne(query);
            res.json(result);
        });

        // bookmark related APIs

        app.post('/api/bookmarks', async (req, res) => {
            const { userEmail, promptId } = req.body;

            if (!userEmail || !promptId) {
                return res.status(400).json({ error: "Missing identity or prompt tokens" });
            }

            // Setup the criteria object
            const criteria = {
                userEmail: userEmail,
                promptId: new ObjectId(promptId)
            };

            // Check if this bookmark already exists in your collection
            const existingBookmark = await bookmarkCollections.findOne(criteria);

            if (existingBookmark) {
                await bookmarkCollections.deleteOne({ _id: existingBookmark._id });
                return res.json({ bookmarked: false, message: "Removed from collection" });
            }
            else {
                await bookmarkCollections.insertOne({
                    ...criteria,
                    createdAt: new Date()
                });
                return res.json({ bookmarked: true, message: "Saved to your dashboard!" });
            }
        });

        app.get('/api/bookmarks/:id', async (req, res) => {
            const id = req.params.id;
            const result = await bookmarkCollections.findOne({
                promptId: new ObjectId(id)
            });
            res.json(result);
        });

        // copy count related APIs

        app.patch('/api/prompts/increment-copy', async (req, res) => {
            const { promptId } = req.body;

            if (!promptId) {
                return res.status(400).json({ error: 'Missing required prompt identity token' });
            }

            const filter = { _id: new ObjectId(promptId) };
            const updateDoc = {
                $inc: { copyCount: 1 }
            };

            const result = await promptCollections.updateOne(filter, updateDoc);
            if (result.matchedCount === 0) {
                return res.status(404).json({ error: "Prompt document not found" });
            }

            res.json(result);
        });

        // report related APIs

        app.post('/api/report', async (req, res) => {
            const { userEmail, promptId, reason, description } = req.body;

            const criteria = {
                userEmail: userEmail,
                promptId: new ObjectId(promptId),
                reason: reason,
                description: description,
            };

            const result = await reportsCollection.insertOne({
                ...criteria,
                createdAt: new Date()
            });
            res.json(result);
        });

        // await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    }
    finally {
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
});