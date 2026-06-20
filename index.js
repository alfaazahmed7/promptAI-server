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

        // all-prompts related APIs

        app.get('/api/prompts', async (req, res) => {
            try {
                // 1. Extract query parameters from the request URL
                const { search, category, aiTool, sort } = req.query;

                // 2. Build a dynamic MongoDB query object
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

                // 3. Build the MongoDB sorting object
                let sortOption = {};
                if (sort === 'popular') {
                    sortOption.copyCount = -1; // Highest copyCount first
                } else if (sort === 'alphabetical') {
                    sortOption.title = 1;     // Alphabetical order A-Z
                } else {
                    sortOption._id = -1;       // Default: 'latest' (Newest first using MongoDB ObjectId timestamp)
                }

                // 4. Fetch the targeted records from MongoDB
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