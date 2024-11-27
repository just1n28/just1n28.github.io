require('dotenv').config();
const express = require('express');
const { MongoClient } = require('mongodb');
const { Configuration, OpenAIApi } = require('openai');
require('dotenv').config();

const app = express();
const PORT = 3000;

// MongoDB Setup
const mongoUrl = process.env.MONGO_URL; // Your local MongoDB connection string
const client = new MongoClient(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true });
const dbName = 'ChatGPT_Evaluation';

// OpenAI Setup
const { OpenAI } = require('openai');
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, 
});

// Middleware to parse JSON requests
app.use(express.json());

// Helper Function to Ensure Persistent MongoDB Connection
async function connectToDatabase() {
    if (!client.isConnected) {
        await client.connect();
    }
    return client.db(dbName);
}

// Route: Retrieve Questions from MongoDB
app.get('/questions/:collectionName', async (req, res) => {
    const { collectionName } = req.params;

    try {
        const db = await connectToDatabase();
        const collection = db.collection(collectionName);

        // Retrieve all questions from the specified collection
        const questions = await collection.find({}).toArray();
        res.status(200).json(questions);
    } catch (error) {
        console.error('Error retrieving questions:', error);
        res.status(500).json({ error: 'Failed to retrieve questions' });
    }
});

// Route: Send Questions to ChatGPT and Save Responses
app.post('/process-questions/:collectionName', async (req, res) => {
    const { collectionName } = req.params;

    try {
        const db = await connectToDatabase();
        const collection = db.collection(collectionName);

        // Retrieve all questions from the collection
        const questions = await collection.find({}).toArray();

        // Process each question with ChatGPT
        const responses = [];
        for (const question of questions) {
            const response = await openai.createCompletion({
                model: "text-davinci-003",
                prompt: question.text, // Assuming 'text' field contains the question
                max_tokens: 150,
            });

            const chatGptResponse = response.data.choices[0].text.trim();

            // Update the MongoDB document with ChatGPT's response
            await collection.updateOne(
                { _id: question._id },
                { $set: { chatGptResponse } }
            );

            responses.push({ question: question.text, chatGptResponse });
        }

        res.status(200).json(responses);
    } catch (error) {
        console.error('Error processing questions:', error);
        res.status(500).json({ error: 'Failed to process questions' });
    }
});

// Route to get a random question for History questions
app.get('/random-question/hQuestions', async (req, res) => {
    try {
        const db = await connectToDatabase();
        const collection = db.collection('hQuestions');

        // Get a random question from the collection
        const randomQuestion = await collection.aggregate([{ $sample: { size: 1 } }]).toArray();

        res.json(randomQuestion[0]);  // Send the random question back to the client
    } catch (error) {
        console.error('Error fetching random question from hQuestions:', error);
        res.status(500).json({ error: 'Failed to fetch random question from hQuestions' });
    }
});

// Route to get a random question for Computer Security questions
app.get('/random-question/csQuestions', async (req, res) => {
    try {
        const db = await connectToDatabase();
        const collection = db.collection('csQuestions');

        // Get a random question from the collection
        const randomQuestion = await collection.aggregate([{ $sample: { size: 1 } }]).toArray();

        res.json(randomQuestion[0]);  // Send the random question back to the client
    } catch (error) {
        console.error('Error fetching random question from csQuestions:', error);
        res.status(500).json({ error: 'Failed to fetch random question from csQuestions' });
    }
});

// Route to get a random question for Social Science questions
app.get('/random-question/sQuestions', async (req, res) => {
    try {
        const db = await connectToDatabase();
        const collection = db.collection('sQuestions');

        // Get a random question from the collection
        const randomQuestion = await collection.aggregate([{ $sample: { size: 1 } }]).toArray();

        res.json(randomQuestion[0]);  // Send the random question back to the client
    } catch (error) {
        console.error('Error fetching random question from sQuestions:', error);
        res.status(500).json({ error: 'Failed to fetch random question from sQuestions' });
    }
});

// Start the Server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});


$(document).ready(function() {
    // Function to fetch random question from the backend
    function getRandomQuestion(collection) {
        $.get(`http://localhost:3000/random-question/${collection}`, function(data) {
            $('#question-text').text(data.question);
            $('#answer-options').empty(); // Clear previous answers

            data.options.forEach(function(option, index) {
                $('#answer-options').append('<li>' + String.fromCharCode(65 + index) + ': ' + option + '</li>');
            });

            $('#correct-answer').text(data.correctAnswer);
            $('#chatgpt-answer').text(data.chatAnswer);
        }).fail(function(xhr, status, error) {
            console.log('Error details:', error);  // Log the error message for debugging
            alert('Error fetching question.');
        });
    }

    // Event listeners for button clicks
    $('#get-random-history-question').click(function() {
        getRandomQuestion('hQuestions');
    });

    $('#get-random-cs-question').click(function() {
        getRandomQuestion('csQuestions');
    });

    $('#get-random-ss-question').click(function() {
        getRandomQuestion('sQuestions');
    });
});
