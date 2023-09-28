require("dotenv").config();
const express = require("express");
const routes = require('./routes');
const users = require("./users");

const app = express();

app.use(express.json());
app.use(routes);
app.use(users)


const PORT = process.env.APP_PORT;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
































