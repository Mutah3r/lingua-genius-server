const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const PORT = process.env.PORT || 5000;
require('dotenv').config()


// middleware
app.use(cors());
app.use(express.json());

// MongoDB URI
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@porfolioprojects.vkb3mrm.mongodb.net/?retryWrites=true&w=majority`;

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
        await client.connect();

        const classCollection = client.db("LinguaGenius").collection("classes");
        const instructorCollection = client.db("LinguaGenius").collection("instructors");
        const allUsersCollection = client.db("LinguaGenius").collection("allUsers");
        const selectedClassesCollection = client.db("LinguaGenius").collection("selectedClasses");

        app.get('/', (req, res) => {
            res.send('Lingua is speaking');
        });

        app.get('/classes', async (req, res) => {
            const result = await classCollection.find().toArray();
            res.send(result);
        });

        app.get('/popularClasses', async (req, res) => {
            const query = { status: 'approved' };
            const options = { sort: { availableSeats: 1 } };
            const result = await classCollection.find(query, options).limit(6).toArray();
            res.send(result);
        });

        app.get('/instructors', async (req, res) => {
            const result = await instructorCollection.find().toArray();
            res.send(result);
        });

        app.get('/user-info', async (req, res) => {
            const email = req.query.email;
            const result = await allUsersCollection.findOne({ email: email });
            res.send(result);
        })

        app.get('/selected-classes', async (req, res) => {
            const email = req.query.email;
            const result = await selectedClassesCollection.find({ email: email }).toArray();
            res.send(result);
        });

        app.get('/class-by-instructor', async (req, res) => {
            const email = req.query.email;
            const result = await classCollection.find({ instructorEmail: email }).toArray();
            res.send(result);
        });

        app.get('/all-users', async (req, res) => {
            const result = await allUsersCollection.find({}).toArray();
            res.send(result);
        });

        app.post('/approve-class', async (req, res) => {
            const classInfo = req.body;
            const { classID } = classInfo;
            const filter = { _id: new ObjectId(classID) };
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    status: 'approved'
                },
            };
            const result = await classCollection.updateOne(filter, updateDoc, options);
            res.send(result);
        })

        app.post('/deny-class', async (req, res) => {
            const classInfo = req.body;
            const { classID } = classInfo;
            const filter = { _id: new ObjectId(classID) };
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    status: 'denied'
                },
            };
            const result = await classCollection.updateOne(filter, updateDoc, options);
            res.send(result);
        })

        app.post('/make-admin', async (req, res) => {
            const userInfo = req.body;
            const { userID } = userInfo;
            const filter = { _id: new ObjectId(userID) };
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    role: 'admin'
                },
            };
            const result = await allUsersCollection.updateOne(filter, updateDoc, options);
            res.send(result);
        })

        app.post('/make-instructor', async (req, res) => {
            const userInfo = req.body;
            const { userID, name, email } = userInfo;
            const filter = { _id: new ObjectId(userID) };
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    role: 'instructor'
                },
            };
            const result = await allUsersCollection.updateOne(filter, updateDoc, options);
            const result2 = await instructorCollection.insertOne({ name, email })
            res.send(result);
        })

        app.post('/send-feedback', async (req, res) => {
            const feedbackInfo = req.body;
            const { message, classID } = feedbackInfo;

            const filter = { _id: new ObjectId(classID) };
            // this option instructs the method to create a document if no documents match the filter
            const options = { upsert: true };
            // create a document that sets the plot of the movie
            const updateDoc = {
                $set: {
                    feedback: message
                },
            };

            const result = await classCollection.updateOne(filter, updateDoc, options);

            res.send(result);
        });

        app.post('/add-instructor-class', async (req, res) => {
            const classInfo = req.body;
            classInfo.status = 'pending';

            const result = await classCollection.insertOne(classInfo);
            res.send(result);
        })

        app.post('/register-user', async (req, res) => {
            const loggedUser = req.body;
            const loggedUerEmail = loggedUser.userEmail;


            const isAlreadyRegistered = await allUsersCollection.findOne({ email: loggedUerEmail });

            if (isAlreadyRegistered) {
                return res.send({ message: 'user is already registered' });
            }

            const doc = {
                email: loggedUerEmail,
                role: 'user'
            };

            const result = await allUsersCollection.insertOne(doc);
            res.send(result);
        })

        app.post('/add-class', async (req, res) => {
            const classInfo = req.body;
            const classID = classInfo.classID;
            const email = classInfo.email;

            const query = {
                classID,
                email
            }

            const alreadySelected = await selectedClassesCollection.findOne(query);

            if (alreadySelected) {
                return res.send({ alreadySelected: true });
            }

            // TODO: chk if the user has already paid for this class or not

            const result = await selectedClassesCollection.insertOne(classInfo);
            res.send(result);
        });

        app.post('/get-feedback', async (req, res) => {
            const classInfo = req.body;
            const { classID } = classInfo;
            const query = { _id: new ObjectId(classID) };

            const result = await classCollection.findOne(query);
            res.send(result);
        })

        app.delete('/remove-selected-class', async (req, res) => {
            const id = req.query.id;
            const query = { _id: new ObjectId(id) };
            const result = await selectedClassesCollection.deleteOne(query);
            res.send(result);
        })


        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);

app.listen(PORT, () => {
    console.log(`App listening on port ${PORT}`);
});
