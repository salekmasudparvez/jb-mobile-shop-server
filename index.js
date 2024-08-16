const express = require('express');
const axios = require('axios');
const multer = require('multer');
const cors = require("cors");
require('dotenv').config();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");


const corsOptions = {
  origin: [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5000",
  ],
  credentials: true,
  optionSuccessStatus: 200,
};
const app = express();
const upload = multer(); 
app.use(cors(corsOptions));
app.use(express.json());

const uri = process.env.VITE_uri;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    const db = client.db("mobileShopDB");
    const usersCollection = db.collection('users');
    const productCollection = db.collection('products');
    
    app.post('/register',async(req,res)=>{
      const newUser = req.body;
      const existingUser = await usersCollection.findOne({ name: newUser?.name});
      if (existingUser) {
        return res.status(400).json({ message: 'Username already exists' });
      }
      const result = await usersCollection.insertOne(newUser);
      res.json(result)
    })
    app.get('/users/:email',async(req,res)=>{
      const email = req.params.email;
      const users = await usersCollection.findOne({email});
      res.json(users);
    })
    app.post('/imageUpload', upload.single('image'), async (req, res) => {
      const imageBuffer = req.file.buffer;
      //console.log(imageBuffer,'line57')
      try {
        const response = await axios.post('https://api.imgur.com/3/image', imageBuffer, {
          headers: {
            Authorization: `Client-ID ${process.env.VITE_imgurClientId}`,
            'Content-Type': 'image/jpeg'
          }
        });
          
        const imageUrl = response.data.data.link;
        console.log(imageUrl)
        res.json({ imageUrl });
      } catch (error) {
        console.error(error.message);
        res.status(500).json({ error: 'Image upload failed' });
      }
    });
    
    app.post('/productUpload',async(req,res)=>{
      const product = req.body;
      console.log(product)
      const result = await productCollection.insertOne(product);
      res.json(result);
    })
    app.get('/category', async (req, res) => {
      try {
        const categories = await productCollection.aggregate([
          {
            $group: {
              _id: "$category"
            }
          },
          {
            $project: {
              _id: 0,
              category: "$_id"
            }
          }
        ]).toArray(); // Convert the cursor to an array
    
        res.json(categories);
      } catch (error) {
        res.status(500).json({ message: "Error fetching categories", error });
      }
    });
    app.get('/products', async (req, res) => {
      try {
        const search = req.query.search || ''; // Default to empty string if no search query
        let query = {};
    
        if (search) {
          // Use a case-insensitive regex for more flexible search
          query = { name: { $regex: new RegExp(search, 'i') } };
        }
    
        const products = await productCollection.find(query).toArray();
        res.json(products);
      } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ error: 'Internal Server Error' });
      }
    });
    
    
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    //await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    //await client.close();
  }
}
run().catch(console.dir);
app.listen(port, () => {
  console.log(`Mobile shop server is running on port: ${port}`);
});

