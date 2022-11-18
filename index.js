const express = require('express');
const cors = require('cors');
const port = process.env.PORT || 5000;
const jwt = require('jsonwebtoken');
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


async function run() {
    try {
        const appointmentOptionsCollection = client.db('doctorsPortal').collection('appointmentOptions');
        const bookingsCollection = client.db('doctorsPortal').collection('bookings');
        const usersCollection = client.db('doctorsPortal').collection('users');

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

            /**
             * API Naming Convention 
             * app.get('/bookings') == all api get
             * app.get('/bookings/:id') 
             * app.post ('/bookings')>>>insertOne()
             * app.patch('/bookings/:id')
             * app.delete('/bookings/:id')
             */

            // api create for myAppointmnet dashboard
            app.get('/bookings', async (req, res) => {
                const email = req.query.email;
                console.log(email);
                const query = { email: email };
                const bookings = await bookingsCollection.find(query).toArray();
                res.send(bookings);
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
        })

        // users api create
        app.post('/users', async (req, res) => {
            const user = req.body;
            console.log(user);
            const result = await usersCollection.insertOne(user);
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