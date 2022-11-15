const express = require('express');
const cors = require('cors');
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();
// app create using express
const app = express();

// middleware
app.use(cors());
app.use(express.json());


user:doctorsPortal
password:LtyQGLzKpuSJ2NAj

const uri = "mongodb+srv://<username>:<password>@cluster0.zkcjl29.mongodb.net/?retryWrites=true&w=majority";
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });




app.get('/', async(req, res) => {
    res.send('doctors portal server is running!')
});
app.listen(port, () => console.log(`doctors portal running on ${port}`));