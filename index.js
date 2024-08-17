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
    "https://mobile-shop-pro.vercel.app",
    "http://localhost:5000",
    "https://mobileshop-pro.netlify.app",
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
    app.get('/brands', async (req, res) => {
      try {
        // Aggregation pipeline to get distinct brands
        const brands = await productCollection.aggregate([
          {
            $group: {
              _id: "$brand" // Group by brand field
            }
          },
          {
            $project: {
              _id: 0,        // Exclude the _id field
              brand: "$_id"  // Rename _id to brand
            }
          }
        ]).toArray(); // Convert the cursor to an array
    
        res.json(brands); // Respond with the list of brands
      } catch (error) {
        console.error('Error fetching brands:', error); // Log the error for debugging
        res.status(500).json({ message: "Error fetching brands", error }); // Send error response
      }
    });
    

    app.get('/products', async (req, res) => {
      try {
        const search = req.query.search || ''; 
        const category = req.query.category || '';
        const brand = req.query.brand || '';
        const tab = req.query.tab || '';
        const minPrice = parseFloat(req.query.minPrice) || 0; 
        const maxPrice = parseFloat(req.query.maxPrice) || Number.MAX_VALUE;
        const page = parseInt(req.query.page);
        const size = parseInt(req.query.size);
        //console.log(minPrice,maxPrice)
        let query = {};
    
        if (search) {
          // Use a case-insensitive regex for more flexible search
          query.name = { $regex: new RegExp(search, 'i') };
        }
    
        if (category) {
          query.category = category;
        }
        if(tab){
          query.category = tab;
        }
         console.log(query)
        if (brand) {
          query.brand = brand;
        }
    
        if (minPrice || maxPrice < Number.MAX_VALUE) {
          query.price = { $gte: minPrice, $lte: maxPrice };
        }
        console.log(query)
        const products = await productCollection.find(query).skip(page * size)
        .limit(size).toArray();
        res.json(products);
      } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ error: 'Internal Server Error' });
      }
    });
    app.get("/count", async (req, res) => {
      const count = await productCollection.estimatedDocumentCount();
      res.send({ count });
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

