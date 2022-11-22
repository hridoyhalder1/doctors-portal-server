const express = require('express');
const cors = require('cors');
const port = process.env.PORT || 5000;
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
// app create using express
const app = express();

// middleware
app.use(cors());
app.use(express.json());

// connect with mongodb
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.zkcjl29.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


function verifyJWT(req, res, next){
    const authHeader = req.headers.authorization;
    if(!authHeader){
        return res.send(401).send('unauthorized access');
    }

    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN, function(err, decoded){
        if(err){
            return res.status(403).send({message: 'forbidden access'});
        }
        req.decoded = decoded;
        next();
    })
}

async function run() {
    try {
        const appointmentOptionsCollection = client.db('doctorsPortal').collection('appointmentOptions');
        const bookingsCollection = client.db('doctorsPortal').collection('bookings');
        const usersCollection = client.db('doctorsPortal').collection('users');
        const doctorsCollection = client.db('doctorsPortal').collection('doctors');

        // NOTE: make sure you use verifyAdmin after verifyJWT
        const verifyAdmin = async(req, res, next) => {
            console.log('inside verifyAdmin', req.decoded.email);
            const decodedEmail = req.decoded.email;
            const query = { email: decodedEmail};
            const user = await usersCollection.findOne(query);

            if(user?.role !== 'admin' ){
                return res.status(403).send({message: 'forbidden access'})
            }
            next();
            
        }

        app.get('/appointmentOptions', async (req, res) => {
            const date = req.query.date;
            console.log(date);
            const query = {};
            const options = await appointmentOptionsCollection.find(query).toArray();

            // get the bookings of the provided date
            const bookingQuery = { appointmentDate: date }
            const alreadyBooked = await bookingsCollection.find(bookingQuery).toArray();

            // code carefully :D
            options.forEach(option => {
                const optionBooked = alreadyBooked.filter(book => book.treatment === option.name);
                const bookedSlots = optionBooked.map(book => book.slot);
                const remainingSlots = option.slots.filter(slot => !bookedSlots.includes(slot));
                option.slots = remainingSlots;
            })
            res.send(options);

            // appointmnet specialty api

            app.get('/appointmentSpecialty', async (req, res) => {
                const query = {}
                const result = await appointmentOptionsCollection.find(query).project({ name: 1 }).toArray();
                res.send(result);
            })

            /**
             * API Naming Convention 
             * app.get('/bookings') == all api get
             * app.get('/bookings/:id') 
             * app.post ('/bookings')>>>insertOne()
             * app.patch('/bookings/:id')
             * app.delete('/bookings/:id')
             */

            // api create for myAppointmnet dashboard
            app.get('/bookings', verifyJWT, async (req, res) => {
                const email = req.query.email;
                const decodedEmail = req.decoded.email;
                if(email !== decodedEmail){
                    return res.status(403).send({message: 'forbidden access'});
                }
                const query = { email: email };
                const bookings = await bookingsCollection.find(query).toArray();
                res.send(bookings);
            });

            // create bookings api id for payment
            app.get('/bookings/:id', async(req, res) => {
                const id = req.params.id;
                const query = { _id:ObjectId(id) };
                const booking = await bookingsCollection.findOne(query);
                res.send(booking);
            })

            app.post('/bookings', async (req, res) => {
                const booking = req.body;
                console.log(booking);
                const query = {
                    appointmentDate: booking.appointmentDate,
                    treatment: booking.treatment
                };
                const alreadyBooked = await bookingsCollection.find(query).toArray();
                if (alreadyBooked.length) {
                    const message = `You already have a booking on ${booking.appointmentDate}`
                    return res.send({ acknowledged: false, message });
                }
                const result = await bookingsCollection.insertOne(booking);
                res.send(result);
            })

        });

        // jwt
        app.get('/jwt', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            if (user) {
                const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, { expiresIn: '1hr' });
                return res.send({ accessToken: token });
            }
            res.status(404).send({ accessToken: '' });
        });

        // allUser api 
        app.get('/users', async(req, res) => {
            const query = {};
            const users = await usersCollection.find(query).toArray();
            res.send(users);
         })

         app.get('/users/admin/:email', async(req, res) => {
            const email = req.params.email;
            const query = { email };
            const user = await usersCollection.findOne(query);
            res.send({isAdmin: user?.role === 'admin' });
         })

        // users api create
        app.post('/users', async (req, res) => {
            const user = req.body;
            console.log(user);
            const result = await usersCollection.insertOne(user);
            res.send(result);
        })

        // updated user
        app.put('/users/admin/:id',verifyJWT, verifyAdmin, async (req, res) => {
            
            const id = req.params.id;
            const filter = { _id: ObjectId(id) }
            const options = { upsert: true };
            const updatedDoc = {
                $set: {
                    role: 'admin'
                }
            }
            const result = await usersCollection.updateOne(filter, updatedDoc, options);
            res.send(result);
        });


        // temporary to update field on appointment options
        app.get('/addPrice', async(req, res) => {
            const filter = {};
            const options ={ upsert: true };
            const updatedDoc ={
                $set: {
                    price: 99.99
                }
            }
            const result = await appointmentOptionsCollection.updateMany(filter, updatedDoc, options);
            res.send(result);
        });


        // doctors
        app.get('/doctors', verifyJWT, verifyAdmin, async(req, res) => {
            const query ={};
            const doctors = await doctorsCollection.find(query).toArray();
            res.send(doctors);
        })

        // doctors post
        app.post('/doctors', verifyJWT,verifyAdmin, async(req, res) => {
            const doctor = req.body;
            const result = await doctorsCollection.insertOne(doctor);
            res.send(result);
        })

        // doctors api delete button action
        app.delete('/doctors/:id', verifyJWT, verifyAdmin, async(req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const result = await doctorsCollection.deleteOne(filter);
            res.send(result);
        })
    }
    finally {

    }
}
run().catch(console.log)


app.get('/', async (req, res) => {
    res.send('doctors portal server is running!')
});
app.listen(port, () => console.log(`doctors portal running on ${port}`));