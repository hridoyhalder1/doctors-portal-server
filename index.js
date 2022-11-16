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

// connect with mongodb
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.zkcjl29.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


async function run(){
    try{
        const appointmentOptionsCollection = client.db('doctorsPortal').collection('appointmentOptions');
        const bookingsCollection = client.db('doctorsPortal').collection('bookings');

        app.get('/appointmentOptions', async(req, res) => {
            const query = {};
            const options = await appointmentOptionsCollection.find(query).toArray();
            res.send(options);

            /**
             * API Naming Convention 
             * app.get('/bookings') == all api get
             * app.get('/bookings/:id') 
             * app.post ('/bookings')>>>insertOne()
             * app.patch('/bookings/:id')
             * app.delete('/bookings/:id')
             */

            app.post('/bookings', async(req, res) => {
                const booking = req.body;
                console.log(booking);
                const result = await bookingsCollection.insertOne(booking);
                res.send(result);
            })

        })

    }
    finally{

    }
}
run().catch(console.log)


app.get('/', async(req, res) => {
    res.send('doctors portal server is running!')
});
app.listen(port, () => console.log(`doctors portal running on ${port}`));