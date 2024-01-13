const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");

const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "userData.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

// User Register
app.post("/register/", async (request, response) => {
  let { username, name, password, gender, location } = request.body; //Destructuring the data from the API call
  let hashedPassword = await bcrypt.hash(password, 10); //Hashing the given password
  let checkTheUsername = `
        SELECT *
            FROM user
        WHERE username = '${username}';`;
  let userData = await db.get(checkTheUsername); //Getting the user details from the database
  if (userData === undefined) {
    let postNewUserQuery = `
            INSERT INTO
                user (username,name,password,gender,location)
            VALUES (
                '${username}',
                '${name}',
                '${hashedPassword}',
                '${gender}',
                '${location}'
            );`;
    if (password.length < 5) {
      //checking the length of the password
      response.status(400);
      response.send("Password is too short");
    } else {
      /*If password length is greater than 5 then this block will execute*/

      let newUserDetails = await db.run(postNewUserQuery); //Updating data to the database
      response.status(200);
      response.send("User created successfully");
    }
  } else {
    /*If the userData is already registered in the database then this block will execute*/
    response.status(400);
    response.send("User already exists");
  }
});

//User Login

app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}';`;
  const dbUser = await db.get(selectUserQuery);

  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
    if (isPasswordMatched === true) {
      response.send("Login success");
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

// Change Password

app.put("/change-password/", async (request, response) => {
  const { username, oldPassword, newPassword } = request.body;
  // checking that user exists
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}'`;
  const dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(
      oldPassword,
      dbUser.password
    );
    if (isPasswordMatched !== true) {
      response.send("Invalid current password");
    }
    if (newPassword.length < 5) {
      response.status(200);
      response.send("Password is too short");
    } else {
      const updatePassword = `
                    UPDATE user 
                    SET
                        password = '${newPassword}';
                    WHERE username = '${username}';`;
      await db.run(updatePassword);
      response.status(400);
      response.send("Password updated");
    }
  }
});

module.exports = app;
