const LocalStrategy = require("passport-local").Strategy;
const { pool } = require("./dbConfig");
const bcrypt = require("bcryptjs");
const passport = require("passport");
function initialize(password) {
  const authenticateUser = (email, password, done) => {
    pool.query(
      `SELECT * FROM users WHERE email = ?`,
      [email],
      (err, results) => {
        if (err) {
          throw err;
        }
        console.log(results);

        if (results.length > 0) {
          const user = results[0];

          bcrypt.compare(password, user.password, (err, isMatch) => {
            if (err) {
              throw err;
            }
            if (isMatch) {
              if (user.activated == false) {
                return done(null, false, { message: "User not Activated" });
              } else {
                return done(null, user);
              }
            } else {
              return done(null, false, { message: "Password is incorrect" });
            }
          });
        } else {
          return done(null, false, { message: "Email is not registered" });
        }
      }
    );
  };

  passport.use(
    new LocalStrategy(
      {
        usernameField: "email",
        passwordField: "password",
      },
      authenticateUser
    )
  );
  password.serializeUser((user, done) => done(null, user.id));

  password.deserializeUser((id, done) => {
    pool.query(`SELECT * FROM users WHERE id = ?`, [id], (err, results) => {
      if (err) {
        throw err;
      }
      return done(null, results[0]);
    });
  });
}

module.exports = initialize;
