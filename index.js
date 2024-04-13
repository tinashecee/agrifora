//IMPORTS
const express = require("express");
const expressLayouts = require("express-ejs-layouts");
const bodyParser = require("body-parser");
const path = require("path");
const flash = require("connect-flash");
const passport = require("passport");
const bcrypt = require("bcryptjs");
const initializePassport = require("./passportConfig");
const session = require("express-session");
const { pool } = require("./dbConfig");
const cors = require("cors");
const moment = require("moment");
const puppeteer = require("puppeteer");
const multer = require("multer");
const exceljs = require("exceljs");
const SENDACTIVATEACCOUNTEMAIL = require("./email-generators/activate_account.js");
const app = express();
initializePassport(passport);
//APP CONFIGS
const PORT = process.env.PORT || 8080;
app.set("views", path.join(__dirname, "views"));
app.use(expressLayouts);
app.set("layout", "./layouts/main");
app.set("view engine", "ejs");
app.use(express.static("./public"));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(
  session({
    secret: "secret$%^134",
    resave: false,
    saveUninitialized: false,
  })
);
app.use(flash());
app.use((req, res, next) => {
  res.locals.moment = moment;
  next();
});
app.use(function (req, res, next) {
  res.locals.message = req.flash();
  next();
});
app.use(bodyParser.json());
const SENDMAIL = require("./mailer.js");
const { error } = require("console");

app.get("/", checkNotAuthenticated, (req, res) => {
  let errors = [];
  pool.getConnection((err, connection) => {
    if (err) {
      console.error("Error getting MySQL connection:", err);
      errors.push({ message: err });
      return res.render("index", {
        layout: "./layouts/index-layout",
        errors,
        prods: [],
      });
    }
    connection.query(
      `SELECT 
    p.id, 
    p.product_name, 
    p.unit,
    p.product_type,
    p.reorder_level,
    s.warehouse,
    SUM(sp.quantity) AS total_quantity,
    MAX(s.stock_date) AS last_stock_in_date
FROM 
    products p
LEFT JOIN 
    stock_products sp ON TRIM(p.product_name) = TRIM(sp.product_name)
LEFT JOIN 
    stock s ON sp.stock_id = s.stock_id
GROUP BY 
    p.id, p.product_name, p.unit, p.product_type, p.reorder_level, s.warehouse;`,
      [],
      (err, results1) => {
        connection.release();
        console.log(results1);
        if (err) {
          console.error("Error executing MySQL query:", err);
          errors.push({ message: err });
          return res.render("index", {
            layout: "./layouts/index-layout",
            errors,
            prods: [],
          });
        } else {
          res.render("index", {
            layout: "./layouts/index-layout",
            errors,
            prods: results1,
          });
        }
      }
    );
  });
});
app.get("/products", checkNotAuthenticated, (req, res) => {
  let errors = [];
  pool.query("SELECT * FROM products", [], (err, results1) => {
    if (err) {
      console.error(err);
      errors.push({ message: err });
      return res.render("products", {
        layout: "./layouts/index-layout",
        errors,
        products: [],
      });
    }
    results1.forEach((e) => {
      console.log(e.product_name);
    });
    res.render("products", {
      layout: "./layouts/index-layout",
      errors,
      products: results1,
    });
  });
});
app.get("/stockmanagement", checkNotAuthenticated, (req, res) => {
  let errors = [];
  pool.query("SELECT * FROM stock", [], (err, results) => {
    if (err) {
      console.error(err);
      errors.push({ message: err });
      return res.render("stockmanagement", {
        layout: "./layouts/index-layout",
        errors,
        prods: [],
        products: [],
        stock: [],
        stock_products: [],
        warehouse: [],
      });
    }
    pool.query("SELECT * FROM stock_products", [], (err, results1) => {
      if (err) {
        console.error(err);
        errors.push({ message: err });
        return res.render("stockmanagement", {
          layout: "./layouts/index-layout",
          errors,
          prods: [],
          products: [],
          stock: [],
          stock_products: [],
          warehouse: [],
        });
      }
      pool.query("SELECT * FROM products", [], (err, results2) => {
        if (err) {
          console.error(err);
          errors.push({ message: err });
          return res.render("stockmanagement", {
            layout: "./layouts/index-layout",
            errors,
            prods: [],
            products: [],
            stock: [],
            stock_products: [],
            warehouse: [],
          });
        }
        pool.query(
          `SELECT 
        p.id, 
        p.product_name, 
        p.unit, 
        p.reorder_level, 
        SUM(sp.quantity) AS total_quantity,
        MAX(s.stock_date) AS last_stock_in_date
    FROM 
        products p
    LEFT JOIN 
        stock_products sp ON TRIM(p.product_name) = TRIM(sp.product_name)
    LEFT JOIN 
        stock s ON sp.stock_id = s.stock_id
    GROUP BY 
        p.id`,
          [],
          (err, resultsA) => {
            if (err) {
              console.error(err);
              errors.push({ message: err });
              return res.render("stockmanagement", {
                layout: "./layouts/index-layout",
                errors,
                prods: [],
                products: [],
                stock: [],
                stock_products: [],
                warehouse: [],
              });
            }
            pool.query("SELECT * FROM warehouse", [], (err, results3) => {
              if (err) {
                console.error(err);
                errors.push({ message: err });
                return res.render("stockmanagement", {
                  layout: "./layouts/index-layout",
                  errors,
                  prods: [],
                  products: [],
                  stock: [],
                  stock_products: [],
                  warehouse: [],
                });
              }
              res.render("stockmanagement", {
                layout: "./layouts/index-layout",
                errors,
                prods: resultsA,
                products: results2,
                stock: results,
                stock_products: results1,
                warehouse: results3,
              });
            });
          }
        );
      });
    });
  });
});
app.get("/dispatch", checkNotAuthenticated, (req, res) => {
  let errors = [];
  pool.getConnection((err, connection) => {
    if (err) {
      console.error("Error getting MySQL connection:", err);
      errors.push({ message: err });
      return res.render("dispatch", {
        layout: "./layouts/index-layout",
        errors,
        dispatch: [],
        dispatched_products: [],
        warehouse: [],
        users: [],
        transporters: [],
        unit: [],
      });
    }
    connection.query("SELECT * FROM dispatch", [], (err, results1) => {
      if (err) {
        console.error(err);
        errors.push({ message: err });
        return res.render("dispatch", {
          layout: "./layouts/index-layout",
          errors,
          dispatch: [],
          dispatched_products: [],
          warehouse: [],
          users: [],
          transporters: [],
          unit: [],
        });
      }
      connection.query(
        "SELECT * FROM dispatched_products",
        [],
        (err, results2) => {
          let errors = [];
          if (err) {
            console.error(err);
            errors.push({ message: err });
            return res.render("dispatch", {
              layout: "./layouts/index-layout",
              errors,
              dispatch: [],
              dispatched_products: [],
              warehouse: [],
              users: [],
              transporters: [],
              unit: [],
            });
          }
          connection.query("SELECT * FROM warehouse", [], (err, results3) => {
            if (err) {
              console.error(err);
              errors.push({ message: err });
              return res.render("dispatch", {
                layout: "./layouts/index-layout",
                errors,
                dispatch: [],
                dispatched_products: [],
                warehouse: [],
                users: [],
                transporters: [],
                unit: [],
              });
            }
            connection.query("SELECT * FROM users", [], (err, results4) => {
              if (err) {
                console.error(err);
                errors.push({ message: err });
                return res.render("dispatch", {
                  layout: "./layouts/index-layout",
                  errors,
                  dispatch: [],
                  dispatched_products: [],
                  warehouse: [],
                  users: [],
                  transporters: [],
                  unit: [],
                });
              }
              connection.query(
                "SELECT * FROM transporters",
                [],
                (err, results5) => {
                  if (err) {
                    console.error(err);
                    errors.push({ message: err });
                    return res.render("dispatch", {
                      layout: "./layouts/index-layout",
                      errors,
                      dispatch: [],
                      dispatched_products: [],
                      warehouse: [],
                      users: [],
                      transporters: [],
                      unit: [],
                    });
                  }
                  connection.query(
                    "SELECT * FROM unit",
                    [],
                    (err, results6) => {
                      connection.release();

                      if (err) {
                        console.error("Error executing MySQL query:", err);
                        errors.push({ message: err });
                        return res.render("dispatch", {
                          layout: "./layouts/index-layout",
                          errors,
                          dispatch: [],
                          dispatched_products: [],
                          warehouse: [],
                          users: [],
                          transporters: [],
                          unit: [],
                        });
                      } else {
                        res.render("dispatch", {
                          layout: "./layouts/index-layout",
                          errors,
                          dispatch: results1,
                          dispatched_products: results2,
                          warehouse: results3,
                          users: results4,
                          transporters: results5,
                          unit: results6,
                        });
                      }
                    }
                  );
                }
              );
            });
          });
        }
      );
    });
  });
});
app.get("/deliverynotes", checkNotAuthenticated, (req, res) => {
  res.render("dispatchno", { layout: "./layouts/index-layout" });
});
app.get("/orderbook", checkNotAuthenticated, (req, res) => {
  let errors = [];
  let columns = [];

  pool.query("SHOW COLUMNS FROM order_book", [], (err, results1a) => {
    if (err) {
      console.error(err);
      errors.push({ message: err });
      return res.render("orderbook", {
        layout: "./layouts/index-layout",
        errors,
        orders: [],
        startDate: "0/0/0",
        endDate: "0/0/0",
        columns,
      });
    }

    results1a.forEach((e) => {
      console.log(e.Field);
      columns.push(e.Field);
    });
    pool.query("SELECT * FROM order_book", [], (err, results1) => {
      if (err) {
        console.error(err);
        errors.push({ message: err });
        return res.render("orderbook", {
          layout: "./layouts/index-layout",
          errors,
          orders: [],
          startDate: "0/0/0",
          endDate: "0/0/0",
          columns,
        });
      }
      pool.query(
        "SELECT * FROM order_book_dates ORDER BY date_uploaded DESC LIMIT 1",
        [],
        (err, results2) => {
          if (err) {
            console.error(err);
            errors.push({ message: err });

            return res.render("orderbook", {
              layout: "./layouts/index-layout",
              errors,
              orders: [],
              startDate: "0/0/0",
              endDate: "0/0/0",
              columns,
            });
          }
          let startDate = "";
          let endDate = "";
          if (results2[0]) {
            startDate = results2[0].start_date;
            endDate = results2[0].end_date;
          }

          res.render("orderbook", {
            layout: "./layouts/index-layout",
            errors,
            orders: results1,
            startDate,
            endDate,
            columns,
          });
        }
      );
    });
  });
});
app.get("/productmovement", checkNotAuthenticated, (req, res) => {
  res.render("productmovement", { layout: "./layouts/index-layout" });
});
app.get("/orderhistory", checkNotAuthenticated, (req, res) => {
  res.render("orderhistory", { layout: "./layouts/index-layout" });
});
app.get("/login", (req, res) => {
  let errors = [];
  res.render("login", { layout: "./layouts/login-layout", errors });
});
app.get("/setpassword", (req, res) => {
  let errors = [];
  let email = req.query.email;
  res.render("setpassword", {
    layout: "./layouts/login-layout",
    errors,
    email,
  });
});
app.get("/resetpassword", (req, res) => {
  let errors = [];
  res.render("resetpassword", { layout: "./layouts/login-layout", errors });
});
app.get("/resetconfirmation", (req, res) => {
  let errors = [];
  res.render("resetconfirmation", { layout: "./layouts/login-layout", errors });
});
app.get("/stockrecon", checkNotAuthenticated, (req, res) => {
  res.render("stockrecon", { layout: "./layouts/index-layout" });
});
app.get("/centermovement", checkNotAuthenticated, (req, res) => {
  res.render("centermovement", { layout: "./layouts/index-layout" });
});
app.get("/reports", checkNotAuthenticated, (req, res) => {
  res.render("reports", { layout: "./layouts/index-layout" });
});
app.get("/users", checkNotAuthenticated, (req, res) => {
  let errors = [];
  pool.query("SELECT * FROM users", [], (err, results) => {
    if (err) {
      console.error(err);
      errors.push({ message: err });
      return res.render("users", {
        layout: "./layouts/index-layout",
        errors,
        users: [],
      });
    }
    res.render("users", {
      layout: "./layouts/index-layout",
      errors,
      users: results,
    });
  });
});
app.get("/transporter", checkNotAuthenticated, (req, res) => {
  let errors = [];
  pool.query("SELECT * FROM transporters", [], (err, results) => {
    if (err) {
      console.error(err);
      errors.push({ message: err });
    }
    pool.query("SELECT * FROM fleet", [], (err, results1) => {
      if (err) {
        console.error(err);
        errors.push({ message: err });
      }
      res.render("transporter", {
        layout: "./layouts/index-layout",
        errors,
        transporters: results,
        fleet: results1,
      });
    });
  });
});
app.get("/warehouse", checkNotAuthenticated, (req, res) => {
  let errors = [];
  pool.query("SELECT * FROM warehouse", [], (err, results1) => {
    if (err) {
      console.error(err);
      errors.push({ message: err });
    }
    res.render("warehouse", {
      layout: "./layouts/index-layout",
      errors,
      warehouse: results1,
    });
  });
});
app.get("/deliverycenters", checkNotAuthenticated, (req, res) => {
  let errors = [];
  pool.query("SELECT * FROM unit", [], (err, results1) => {
    if (err) {
      console.error(err);
      errors.push({ message: err });
      return res.render("deliverycenters", {
        layout: "./layouts/index-layout",
        errors,
        units: [],
      });
    }
    res.render("deliverycenters", {
      layout: "./layouts/index-layout",
      errors,
      units: results1,
    });
  });
});
app.get("/faq", checkNotAuthenticated, (req, res) => {
  res.render("faq", { layout: "./layouts/index-layout" });
});

//POST SCRIPTS
app.post("/add-user", async (req, res) => {
  let errors = [];
  let { firstName, surname, email, phone, organisation, userRole, units } =
    req.body;
  console.log(firstName, surname, email, phone, organisation, userRole, units);
  let formattedUnits = "";

  if (typeof units === "string") {
    formattedUnits = units;
  } else {
    formattedUnits = units.join(", ");
  }
  let yourDate = new Date();
  date_created = formatDate(yourDate);
  pool.query(
    `INSERT INTO users (firstname, surname, email, phone, organisation, user_role, unit, date_joined)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      firstName,
      surname,
      email,
      phone,
      organisation,
      userRole,
      formattedUnits,
      date_created,
    ],
    (err, results) => {
      if (err) {
        console.error(err);
        errors.push({ message: err });
        return res.redirect("/users");
      }

      SENDACTIVATEACCOUNTEMAIL(firstName + " " + surname, date_created, email);
      req.flash("success", "You have successfully added a new user");
      res.redirect("/users");
    }
  );
});
app.post("/add-transporter", async (req, res) => {
  let errors = [];
  let { transporterName, contactPerson, phoneNumber, fleetDetails } = req.body;
  let yourDate = new Date();
  date_created = formatDate(yourDate);

  pool.query(
    `
      INSERT INTO transporters (transporter_name, contact_person, phone, date_added)
      VALUES (?, ?, ?, ?)
    `,
    [transporterName, contactPerson, phoneNumber, date_created],
    (err, results) => {
      if (err) {
        // Handle error
        console.error(err);
        errors.push({ message: err });
        return res.redirect("/transporter");
      }
      const transporterId = results.insertId;
      for (let fleetDetail of fleetDetails) {
        const { truckType, truckTonnage, regNumber } = fleetDetail;
        pool.query(
          `
          INSERT INTO fleet (truck_type, truck_tonnage, reg_number, date_added, transporter_id)
          VALUES (?, ?, ?, ?, ?)`,
          [truckType, truckTonnage, regNumber, date_created, transporterId],
          (err, results) => {
            if (err) {
              // Handle error
              console.error(err);
              errors.push({ message: err });
              return res.redirect("/transporter");
            }
          }
        );
      }
      req.flash("success", "You have successfully added a transporter");
      res.redirect("/transporter");
    }
  );
});
app.post("/add-warehouse", async (req, res) => {
  let errors = [];
  let { warehouseName, location, warehousecontact, warephonenumber } = req.body;
  pool.query(
    `
      INSERT INTO warehouse (warehouse_name, location, contact_person, phone)
      VALUES (?, ?, ?, ?)
    `,
    [warehouseName, location, warehousecontact, warephonenumber],
    (err, results) => {
      if (err) {
        // Handle error
        console.error(err);
        errors.push({ message: err });
        return res.redirect("/warehouse");
      }
      req.flash("success", "You have successfully added a warehouse");
      res.redirect("/warehouse");
    }
  );
});
app.post("/add-unit", async (req, res) => {
  let errors = [];
  let {
    unitName,
    location,
    province,
    deliveryPoint,
    contactPerson,
    phoneNumber,
  } = req.body;
  pool.query(
    `
      INSERT INTO unit (unit_name, location, province, delivery_point, contact_person, phone)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    [unitName, location, province, deliveryPoint, contactPerson, phoneNumber],
    (err, results) => {
      if (err) {
        // Handle error
        console.error(err);
        errors.push({ message: err });
        return res.redirect("/deliverycenters");
      }
      req.flash("success", "You have successfully added a unit");
      res.redirect("/deliverycenters");
    }
  );
});
app.post("/add-product", async (req, res) => {
  let errors = [];
  let {
    productName,
    productDescription,
    productType,
    unitMeasure,
    alternateUnit,
    conversionFactor,
  } = req.body;
  pool.getConnection((err, connection) => {
    if (err) {
      console.error("Error getting MySQL connection:", err);
      req.flash("error", "Failed to connect to DB");
      errors.push({ message: err });
      return res.redirect("/products");
    }
    connection.query(
      `
      INSERT INTO products (product_name, description, product_type, unit, alternative_unit, conversion_factor)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
      [
        productName,
        productDescription,
        productType,
        unitMeasure,
        alternateUnit,
        conversionFactor,
      ],
      (err, results) => {
        if (err) {
          // Handle error
          console.error(err);
          errors.push({ message: err });
          return res.redirect("/products");
        }
        // Remove spaces from the input string
        const columnName = removeSpaces(productName);

        // SQL query to create a column with float parameter
        const createColumnQuery = `ALTER TABLE your_table_name ADD COLUMN ${columnName} FLOAT`;

        // Execute the SQL query
        connection.query(createColumnQuery, (err, results) => {
          if (err) {
            console.error("Error creating column:", err);
            errors.push({ message: err });
            return res.redirect("/products");
          }
          console.log("Column created successfully");
          connection.release();
          req.flash("success", "You have successfully added a product");
          res.redirect("/products");
        });
      }
    );
  });
});
app.post("/add-stock", async (req, res) => {
  let errors = [];
  let { stockDate, warehouse, supplier, products } = req.body;
  let yourDate = new Date();
  date_created = formatDate(yourDate);

  pool.query(
    `
      INSERT INTO stock (stock_date, warehouse, supplier)
      VALUES (?, ?, ?)
    `,
    [stockDate, warehouse, supplier],
    (err, results) => {
      if (err) {
        // Handle error
        console.error(err);
        errors.push({ message: err });
        return res.redirect("/stockmanagement");
      }
      const stockId = results.insertId;
      for (let productDetail of products) {
        const { product, quantity, unit } = productDetail;
        pool.query(
          `
          INSERT INTO stock_products (product_name, quantity, unit, stock_id)
          VALUES (?, ?, ?, ?)`,
          [product, quantity, unit, stockId],
          (err, results) => {
            if (err) {
              // Handle error
              console.error(err);
              errors.push({ message: err });
              return res.redirect("/stockmanagement");
            }
          }
        );
      }
      req.flash("success", "You have successfully added stock");
      res.redirect("/stockmanagement");
    }
  );
});
app.post("/add-dispatch", async (req, res) => {
  let errors = [];
  let {
    dispatchDate,
    warehouse,
    staffMember,
    transporter,
    deliveryCenter,
    products,
  } = req.body;
  let yourDate = new Date();
  date_created = formatDate(yourDate);
  console.log("ghh");
  pool.query(
    `
      INSERT INTO dispatch (dispatch_date, warehouse, staff_member, transporter, delivery_center)
      VALUES (?, ?, ?, ?, ?)
    `,
    [dispatchDate, warehouse, staffMember, transporter, deliveryCenter],
    (err, results) => {
      if (err) {
        // Handle error
        console.error(err);
        errors.push({ message: err });
        return res.redirect("/dispatch");
      }
      const dispatchId = results.insertId;
      for (let productDetail of products) {
        const { product, quantity, unit } = productDetail;
        pool.query(
          `
          INSERT INTO dispatched_products (product_name, quantity, unit, dispatch_id)
          VALUES (?, ?, ?, ?)`,
          [product, quantity, unit, dispatchId],
          (err, results) => {
            if (err) {
              // Handle error
              console.error(err);
              errors.push({ message: err });
              return res.redirect("/dispatch");
            }
          }
        );
      }
      req.flash("success", "You have successfully added dispatch");
      res.redirect("/dispatch");
    }
  );
});
app.post("/reorder-level", async (req, res) => {
  let errors = [];
  let id = req.body.id;
  let lvl = req.body.reorderLevel;
  pool.query(
    "UPDATE products SET reorder_level = ? WHERE id = ?",
    [lvl, id],
    (err, results) => {
      if (err) {
        // Handle error
        console.error(err);
        errors.push({ message: err });
        return res.redirect("/stockmanagement");
      }
      req.flash("success", "Reorder Level updated");
      res.redirect("/stockmanagement");
    }
  );
});
app.post("/set-password", async (req, res) => {
  const email = req.body.email;
  const password1 = req.body.new_password;
  const password2 = req.body.confirm_password;
  const errors = [];

  if (password1 !== password2) {
    errors.push({ message: "Passwords do not match" });
    return res.render("setpassword", {
      layout: "./layouts/login-layout",
      errors: errors,
    });
  } else {
    const hashedPassword = await bcrypt.hash(password1, 10);
    pool.query(
      "UPDATE users SET password = ?, activated = ? WHERE email = ?",
      [hashedPassword, true, email],
      (err, results) => {
        if (err) {
          console.error(err);
          errors.push({ message: err });
          return res.render("setpassword", {
            layout: "./layouts/login-layout",
            errors: errors,
          });
        } else {
          req.flash(
            "success",
            "Password setup successful, you can now login into your account"
          );
          res.redirect("/login");
        }
      }
    );
  }
});
app.post("/reset-password", (req, res) => {
  let errors = [];
  const email = req.body.email;
  pool.query("SELECT * FROM users WHERE email = ?", [email], (err, results) => {
    if (err) {
      console.error(err);
      errors.push({ message: err });
      return res.redirect("/passwordreset");
    }
    if (results.length === 0) {
      req.flash("error", "Email is not registered in the system!");
      errors.push({ message: err });
      return res.redirect("/passwordreset");
    }

    // Code to send reset password email
    const message = "Email to reset password of your Agrifora account";
    const options = {
      from: "Agrifora", // sender address
      to: email, // receiver email
      subject: "Agrifora System - Account Verification", // Subject line
      text: message,
      html: `<div>
        <p>Hi, <b>${results[0].firstname}</b>,</p>
        <p>We received a request to reset your password for your Prolegal Case Management account. If you did not request this, please disregard this email.</p>
        <p>To reset your password, please click on the following link:</p>
        <a href="http://localhost:8080/setpassword?email=${email}&secret=${results[0].password}">RESET PASSWORD LINK</a>
        <p>This link will only be valid for 24 hours.</p>
        <p>If you are unable to click on the link, please copy and paste it into your browser.</p>
        <p>Once you have clicked on the link, you will be taken to a page where you can enter a new password for your account. Please choose a strong password that is at least 8 characters long and includes a mix of upper and lowercase letters, numbers, and symbols.</p>
        <p>After you have entered your new password, you will be able to log in to your account.</p>
        <p>If you have any questions, please do not hesitate to contact us.</p>
        <p>Thank you,</p>
        <p>Agrifora Team</p>
</div>`,
    };

    // Send the email
    SENDMAIL(options, (info) => {
      req.flash("success", "Reset Password email sent");
      res.redirect("/resetconfirmation");
    });
  });
});

// Multer setup for file upload
const upload = multer();

// Route to handle file upload
app.post("/upload-excel", upload.single("excelFile"), (req, res) => {
  const { start_date, end_date } = req.body;

  // Check if file was uploaded
  if (!req.file) {
    return res.status(400).send("No file uploaded.");
  }

  // Parse the uploaded Excel file from memory
  const workbook = new exceljs.Workbook();
  workbook.xlsx
    .load(req.file.buffer)
    .then(() => {
      const worksheet = workbook.getWorksheet(1);
      const headers = worksheet.getRow(1).values;

      // Insert data into the database
      let errors = [];
      worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        if (rowNumber > 1) {
          // Skip header row
          const rowData = row.values.slice(1); // Exclude the first value which is assumed to be the ID
          const nonEmptyHeaders = headers.filter((header) => header); // Filter out empty headers
          const placeholders = Array(nonEmptyHeaders.length)
            .fill("?")
            .join(", ");
          const sql = `INSERT INTO order_book (start_date, end_date, ${nonEmptyHeaders.join(
            ","
          )}) VALUES (?, ?, ${placeholders})`;
          console.log(sql);
          pool.query(
            sql,
            [formatDate(start_date), formatDate(end_date), ...rowData],
            (error, results, fields) => {
              if (error) {
                console.error("Error inserting row:", error);
                errors.push({ message: error });
                return res.redirect("/orderbook");
              } else {
                console.log("Row inserted successfully:", results.insertId);
              }
            }
          );
        }
      });
      let yourDate = new Date();
      date_created = formatDate(yourDate);
      pool.query(
        `
    INSERT INTO order_book_dates ( start_date, end_date, date_uploaded)
    VALUES (?, ?, ?)`,
        [formatDate(start_date), formatDate(end_date), date_created],
        (err, results) => {
          if (err) {
            // Handle error
            console.error(err);
            errors.push({ message: err });
            return res.redirect("/orderbook");
          }
        }
      );
    })
    .then(() => {
      req.flash("success", "Order Book Updated!");
      return res.redirect("/orderbook");
    })
    .catch((err) => {
      console.error("Error parsing Excel file:", err);
      res.status(500).send("Error parsing Excel file.");
    });
});

// Insert data into the database
function insertDataIntoDatabase(worksheet, headers, start_date, end_date) {}

app.post(
  "/login",
  passport.authenticate("local", {
    //successRedirect: '/',

    failureRedirect: "/login",
    failureFlash: true,
  }),
  (req, res) => {
    usrId = req.user.id;
    authed = true;
    req.session.userId = req.user.id;
    req.session.user = req.user.name;
    req.session.email = req.user.email;
    req.session.role = req.user.role;
    req.session.activated = req.user.activated;
    req.session.id = req.user.id;

    res.redirect("/");
  }
);
app.get("/logout", (req, res) => {
  req.session.destroy();
  //req.flash('success','User signed out');
  res.redirect("/login");
});

// Function to remove spaces from a string
function removeSpaces(str) {
  return str.replace(/\s/g, ""); // Using regular expression to replace all spaces with an empty string
}
function formatDate(date) {
  var d = new Date(date),
    month = "" + (d.getMonth() + 1),
    day = "" + d.getDate(),
    year = d.getFullYear();

  if (month.length < 2) month = "0" + month;
  if (day.length < 2) day = "0" + day;

  return [year, month, day].join("-");
}
function checkNotAuthenticated(req, res, next) {
  if (req.session.email != null) {
    authed = true;
    return next();
  }
  authed = false;
  res.redirect("/login");
}

app.listen(PORT, console.log(`Server running on port ${PORT}`));
