const express = require('express');
const dotenv = require('dotenv');
dotenv.config();
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');


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
            const result = await promptCollections.find().toArray();
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