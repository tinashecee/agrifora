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
  let columns = [];
  const dryColumnTotals = {};
  const perishableColumnTotals = {};
  let dryProducts = [];
  let perishableProducts = [];
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
        connection.query(
          "SELECT * FROM order_summary WHERE YEAR(end_date) = YEAR(CURRENT_DATE()) AND MONTH(end_date) = MONTH(CURRENT_DATE());",
          [],
          (err, results1a) => {
            if (err) {
              console.error(err);
              errors.push({ message: err });
              return res.render("products", {
                layout: "./layouts/index-layout",
                errors,
                products: [],
              });
            }
            connection.query("SELECT * FROM unit", [], (err, results2a) => {
              connection.query(
                "SHOW COLUMNS FROM order_summary",
                [],
                (err, results1b) => {
                  if (err) {
                    console.error(err);
                    errors.push({ message: err });
                    return res.render("index", {
                      layout: "./layouts/index-layout",
                      errors,
                      prods: [],
                    });
                  }

                  results1b.forEach((e) => {
                    if (
                      e.Field != "ser" ||
                      e.Field != "id" ||
                      e.Field != "unit" ||
                      e.Field != "delivery_point"
                    ) {
                      columns.push(e.Field);
                    }
                  });
                  if (results1) {
                    dryProducts.push("start_date");
                    dryProducts.push("end_date");
                    perishableProducts.push("start_date");
                    perishableProducts.push("end_date");
                    columns.forEach((order) => {
                      // Flag to track if the order has been pushed to any array
                      let orderPushed = false;

                      // Iterate over the products array to find a match for the product name
                      for (product of results1) {
                        // Skip if paramName is id, start_date, end_date, unit, or delivery_point
                        if (
                          ![
                            "id",
                            "start_date",
                            "end_date",
                            "unit",
                            "delivery_point",
                          ].includes(order)
                        ) {
                          // Find a matching product in results3a
                          const matchingProduct = results1.find(
                            (product) =>
                              order === removeSpaces(product.product_name)
                          );

                          // If a matching product is found
                          if (matchingProduct) {
                            // Determine the product type
                            if (matchingProduct.product_type === "Dry Goods") {
                              // Push the order into the dryProducts array if not already added
                              if (!orderPushed) {
                                dryProducts.push(order);
                                orderPushed = true;
                              }
                            } else if (
                              matchingProduct.product_type === "Perishable"
                            ) {
                              // Push the order into the perishableProducts array if not already added
                              if (!orderPushed) {
                                perishableProducts.push(order);
                                orderPushed = true;
                              }
                            }
                          }
                        }
                      }
                    });
                  }
                  connection.release();
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
                      orders: results1a,
                      columns,
                      dryProducts,
                      dryColumnTotals,
                      perishableProducts,
                      perishableColumnTotals,
                      delivery_units: results2a,
                      prods: results1,
                    });
                  }
                }
              );
            });
          }
        );
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
        products: [],
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
          products: [],
        });
      }
      connection.query("SELECT * FROM dispatch_units", [], (err, results2) => {
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
            products: [],
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
              products: [],
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
                products: [],
              });
            }
            connection.query("SELECT * FROM products", [], (err, results4a) => {
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
                  products: [],
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
                      products: [],
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
                          products: [],
                        });
                      } else {
                        res.render("dispatch", {
                          layout: "./layouts/index-layout",
                          errors,
                          dispatch: results1,
                          dispatched_products: results2,
                          warehouse: results3,
                          users: results4,
                          products: results4a,
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
        });
      });
    });
  });
});
app.get("/deliverynotes", checkNotAuthenticated, (req, res) => {
  res.render("dispatchno", { layout: "./layouts/index-layout" });
});
app.get("/warehousemovement", checkNotAuthenticated, (req, res) => {
  let errors = [];
  pool.query("SELECT * FROM warehouse", [], (err, warehouses) => {
    if (err) {
      console.error(err);
      errors.push({ message: err });
      res.render("warehousehouse", {
        layout: "./layouts/index-layout",
        errors,
        warehouses: [],
        products: [],
      });
    }
    pool.query("SELECT * FROM products", [], (err, products) => {
      if (err) {
        console.error(err);
        errors.push({ message: err });
        res.render("warehousehouse", {
          layout: "./layouts/index-layout",
          errors,
          warehouses: [],
          products: [],
        });
      }
      res.render("warehousemovement", {
        layout: "./layouts/index-layout",
        errors,
        errors,
        warehouses,
        products,
      });
    });
  });
});
app.get("/orderbook", checkNotAuthenticated, (req, res) => {
  let errors = [];
  let columns = [];
  const dryColumnTotals = {};
  const perishableColumnTotals = {};
  let dryProducts = [];
  let perishableProducts = [];
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
        dryProducts,
        perishableProducts,
        dryColumnTotals,
        perishableColumnTotals,
      });
    }

    results1a.forEach((e) => {
      columns.push(e.Field);
    });
    pool.query(
      "SELECT * FROM order_book_dates ORDER BY end_date DESC LIMIT 1",
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
            dryProducts,
            perishableProducts,
            dryColumnTotals,
            perishableColumnTotals,
          });
        }
        let startDate = "";
        let endDate = "";
        if (results2[0]) {
          startDate = results2[0].start_date;
          endDate = results2[0].end_date;
        }
        console.log(startDate, endDate);
        pool.query(
          "SELECT * FROM order_book WHERE start_date = ? AND end_date = ?",
          [startDate, endDate],
          (err, results1) => {
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
                dryProducts,
                perishableProducts,
                dryColumnTotals,
                perishableColumnTotals,
              });
            }
            pool.query("SELECT * FROM products", [], (err, results3a) => {
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
                  dryProducts,
                  perishableProducts,
                  dryColumnTotals,
                  perishableColumnTotals,
                });
              }
              if (results1) {
                dryProducts.push("id");
                dryProducts.push("start_date");
                dryProducts.push("end_date");
                dryProducts.push("unit");
                dryProducts.push("delivery_point");
                perishableProducts.push("id");
                perishableProducts.push("start_date");
                perishableProducts.push("end_date");
                perishableProducts.push("unit");
                perishableProducts.push("delivery_point");
                columns.forEach((order) => {
                  // Flag to track if the order has been pushed to any array
                  let orderPushed = false;

                  // Iterate over the products array to find a match for the product name
                  for (product of results3a) {
                    // Skip if paramName is id, start_date, end_date, unit, or delivery_point
                    if (
                      ![
                        "id",
                        "start_date",
                        "end_date",
                        "unit",
                        "delivery_point",
                      ].includes(order)
                    ) {
                      // Find a matching product in results3a
                      const matchingProduct = results3a.find(
                        (product) =>
                          order === removeSpaces(product.product_name)
                      );

                      // If a matching product is found
                      if (matchingProduct) {
                        // Determine the product type
                        if (matchingProduct.product_type === "Dry Goods") {
                          // Push the order into the dryProducts array if not already added
                          if (!orderPushed) {
                            dryProducts.push(order);
                            orderPushed = true;
                          }
                        } else if (
                          matchingProduct.product_type === "Perishable"
                        ) {
                          // Push the order into the perishableProducts array if not already added
                          if (!orderPushed) {
                            perishableProducts.push(order);
                            orderPushed = true;
                          }
                        }
                      }
                    }
                  }
                });

                dryProducts.forEach((column) => {
                  dryColumnTotals[column] = results1.reduce((total, order) => {
                    return (
                      total +
                      (typeof order[column] === "number" ? order[column] : 0)
                    );
                  }, 0);
                });
                perishableProducts.forEach((column) => {
                  perishableColumnTotals[column] = results1.reduce(
                    (total, order) => {
                      return (
                        total +
                        (typeof order[column] === "number" ? order[column] : 0)
                      );
                    },
                    0
                  );
                });
              }
              res.render("orderbook", {
                layout: "./layouts/index-layout",
                errors,
                orders: results1,
                startDate,
                endDate,
                columns,
                dryProducts,
                perishableProducts,
                dryColumnTotals,
                perishableColumnTotals,
              });
            });
          }
        );
      }
    );
  });
});
app.get("/orderhistory-view", checkNotAuthenticated, (req, res) => {
  let errors = [];
  let columns = [];
  const dryColumnTotals = {};
  const perishableColumnTotals = {};
  let dryProducts = [];
  let perishableProducts = [];
  let startDate = new Date(req.query.start_date);
  let endDate = new Date(req.query.end_date);

  // Now format these dates into the 'YYYY-MM-DD' format expected by SQL
  const formattedStartDate = startDate.toISOString().slice(0, 10);
  const formattedEndDate = endDate.toISOString().slice(0, 10);
  console.log(formattedStartDate, formattedEndDate);
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
        dryProducts,
        perishableProducts,
        dryColumnTotals,
        perishableColumnTotals,
      });
    }

    results1a.forEach((e) => {
      columns.push(e.Field);
    });
    pool.query(
      "SELECT * FROM order_book WHERE start_date >= ? AND end_date <= ?",
      [formattedStartDate, formattedEndDate],
      (err, results1) => {
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
            dryProducts,
            perishableProducts,
            dryColumnTotals,
            perishableColumnTotals,
          });
        }
        console.log(results1);
        pool.query("SELECT * FROM products", [], (err, results3a) => {
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
              dryProducts,
              perishableProducts,
              dryColumnTotals,
              perishableColumnTotals,
            });
          }
          if (results1) {
            dryProducts.push("id");
            dryProducts.push("start_date");
            dryProducts.push("end_date");
            dryProducts.push("unit");
            dryProducts.push("delivery_point");
            perishableProducts.push("id");
            perishableProducts.push("start_date");
            perishableProducts.push("end_date");
            perishableProducts.push("unit");
            perishableProducts.push("delivery_point");
            columns.forEach((order) => {
              // Flag to track if the order has been pushed to any array
              let orderPushed = false;

              // Iterate over the products array to find a match for the product name
              for (product of results3a) {
                // Skip if paramName is id, start_date, end_date, unit, or delivery_point
                if (
                  ![
                    "id",
                    "start_date",
                    "end_date",
                    "unit",
                    "delivery_point",
                  ].includes(order)
                ) {
                  // Find a matching product in results3a
                  const matchingProduct = results3a.find(
                    (product) => order === removeSpaces(product.product_name)
                  );

                  // If a matching product is found
                  if (matchingProduct) {
                    // Determine the product type
                    if (matchingProduct.product_type === "Dry Goods") {
                      // Push the order into the dryProducts array if not already added
                      if (!orderPushed) {
                        dryProducts.push(order);
                        orderPushed = true;
                      }
                    } else if (matchingProduct.product_type === "Perishable") {
                      // Push the order into the perishableProducts array if not already added
                      if (!orderPushed) {
                        perishableProducts.push(order);
                        orderPushed = true;
                      }
                    }
                  }
                }
              }
            });

            dryProducts.forEach((column) => {
              dryColumnTotals[column] = results1.reduce((total, order) => {
                return (
                  total +
                  (typeof order[column] === "number" ? order[column] : 0)
                );
              }, 0);
            });
            perishableProducts.forEach((column) => {
              perishableColumnTotals[column] = results1.reduce(
                (total, order) => {
                  return (
                    total +
                    (typeof order[column] === "number" ? order[column] : 0)
                  );
                },
                0
              );
            });
          }
          res.render("orderhistory_view", {
            layout: "./layouts/index-layout",
            errors,
            orders: results1,
            startDate,
            endDate,
            columns,
            dryProducts,
            perishableProducts,
            dryColumnTotals,
            perishableColumnTotals,
          });
        });
      }
    );
  });
});
app.get("/productmovement", checkNotAuthenticated, (req, res) => {
  let errors = [];
  pool.query("SELECT * FROM products", [], (err, results1) => {
    if (err) {
      console.error(err);
      errors.push({ message: err });
      return res.render("productmovement", {
        layout: "./layouts/index-layout",
        errors,
        products: [],
        stock: [],
        stock_products: [],
        dispatch: [],
        dispatch_units: [],
      });
    }
    pool.query("SELECT * FROM stock_products", [], (err, results2) => {
      if (err) {
        console.error(err);
        errors.push({ message: err });
        return res.render("productmovement", {
          layout: "./layouts/index-layout",
          errors,
          products: [],
          stock: [],
          stock_products: [],
          dispatch: [],
          dispatch_units: [],
        });
      }
      pool.query("SELECT * FROM dispatch", [], (err, results3) => {
        if (err) {
          console.error(err);
          errors.push({ message: err });
          return res.render("productmovement", {
            layout: "./layouts/index-layout",
            errors,
            products: [],
            stock: [],
            stock_products: [],
            dispatch: [],
            dispatch_units: [],
          });
        }
        let totalPurchases = 0;
        results2.forEach((e) => {
          totalPurchases += e.quantity;
        });
        let totalDispatched = 0;
        results3.forEach((e) => {
          totalDispatched += e.quantity;
        });

        res.render("productmovement", {
          layout: "./layouts/index-layout",
          errors,
          products: results1,
          stock_products: results2,
          dispatch: results3,
          totalPurchases,
          totalDispatched,
        });
      });
    });
  });
});
app.post("/productmovement", checkNotAuthenticated, (req, res) => {
  let errors = [];
  let fromDate = req.body.fromDate;
  let toDate = req.body.toDate;
  pool.query(
    "SELECT * FROM products WHERE product_name = ?",
    [req.body.product],
    (err, results) => {
      if (err) {
        console.error(err);
        errors.push({ message: err });
        return res.render("productmovement", {
          layout: "./layouts/index-layout",
          errors,
          products: [],
          stock: [],
          stock_products: [],
          dispatch: [],
          dispatch_units: [],
        });
      }
      pool.query(
        "SELECT * FROM stock_products WHERE stock_date >= ? AND stock_date <= ?",
        [fromDate, toDate],
        (err, stock_products) => {
          if (err) {
            console.error(err);
            errors.push({ message: err });
            return res.render("productmovement", {
              layout: "./layouts/index-layout",
              errors,
              products: [],
              stock: [],
              stock_products: [],
              dispatch: [],
              dispatch_units: [],
            });
          }
          pool.query(
            "SELECT * FROM dispatch WHERE dispatch_date >= ? AND dispatch_date <= ?",
            [fromDate, toDate],
            (err, dispatch) => {
              if (err) {
                console.error(err);
                errors.push({ message: err });
                return res.render("productmovement", {
                  layout: "./layouts/index-layout",
                  errors,
                  products: [],
                  stock: [],
                  stock_products: [],
                  dispatch: [],
                  dispatch_units: [],
                });
              }
              let stockResults = [];
              let dispatchResults = [];
              stock_products.forEach((e) => {
                if (e.product_name == req.body.product) {
                  stockResults.push(e);
                }
              });
              dispatch.forEach((e) => {
                if (e.product == req.body.product) {
                  dispatchResults.push(e);
                }
              });
              // Combine and sort the results
              const movements = [
                ...stockResults.map((result) => ({
                  ...result,
                  date: result.stock_date,
                })),
                ...dispatchResults.map((result) => ({
                  ...result,
                  date: result.dispatch_date,
                })),
              ];

              movements.sort((a, b) => new Date(a.date) - new Date(b.date));
              console.log(movements);
              res.send({
                movements: movements,
                reorderLevel: results[0].reorder_level,
              });
            }
          );
        }
      );
    }
  );
});
app.post("/stockmovement", checkNotAuthenticated, (req, res) => {
  let errors = [];
  let fromDate = req.body.fromDate;
  let toDate = req.body.toDate;
  let arry = [];
  pool.query("SELECT * FROM products ", [], (err, results) => {
    if (err) {
      console.error(err);
      errors.push({ message: err });
      return res.render("index", {
        layout: "./layouts/index-layout",
        errors,
        orders: [],
        columns: [],
        dryProducts: [],
        dryColumnTotals: [],
        perishableProducts: [],
        perishableColumnTotals: [],
        delivery_units: [],
        prods: [],
      });
    }
    pool.query(
      "SELECT * FROM order_summary WHERE start_date >= ? AND end_date <= ?",
      [fromDate, toDate],
      (err, results1) => {
        if (err) {
          console.error(err);
          errors.push({ message: err });
          return res.render("index", {
            layout: "./layouts/index-layout",
            errors,
            orders: [],
            columns: [],
            dryProducts: [],
            dryColumnTotals: [],
            perishableProducts: [],
            perishableColumnTotals: [],
            delivery_units: [],
            prods: [],
          });
        }
        results.forEach((e) => {
          let ttl = 0;
          const columnName = removeSpaces(e.product_name);
          results1.forEach((f) => {
            ttl += f[columnName];
          });
          arry.push({
            id: e.id,
            product: e.product_name,
            quantity_ordered: ttl,
          });
        });

        console.log(arry);

        res.send({ arry: arry });
      }
    );
  });
});
app.post("/unitmovement", checkNotAuthenticated, (req, res) => {
  let errors = [];
  let fromDate = req.body.fromDate;
  let toDate = req.body.toDate;
  const unit = req.body.unit;
  let arry = [];
  console.log("HJHJH");
  pool.query(
    "SELECT * FROM order_book WHERE start_date >= ? AND end_date <= ? AND unit = ?",
    [fromDate, toDate, unit],
    (err, results1) => {
      if (err) {
        console.error(err);
        errors.push({ message: err });
        return res.render("centermovement", {
          layout: "./layouts/index-layout",
          errors,
          units: [],
        });
      }
      pool.query("SELECT * FROM products", [], (err, results1a) => {
        if (err) {
          console.error(err);
          errors.push({ message: err });
          return res.render("centermovement", {
            layout: "./layouts/index-layout",
            errors,
            prods: [],
          });
        }
        pool.query(
          "SELECT * FROM unit WHERE unit_name = ?",
          [unit],
          (err, results2) => {
            if (err) {
              console.error(err);
              errors.push({ message: err });
              return res.render("centermovement", {
                layout: "./layouts/index-layout",
                errors,
                prods: [],
              });
            }

            results1a.forEach((e) => {
              const columnName = removeSpaces(e.product_name);
              let totalProduct = 0;
              results1.forEach((row) => {
                // Check if the row contains the 'Salt' field
                if (columnName in row) {
                  // If 'Salt' field exists, add its value to the totalSalt
                  totalProduct += parseFloat(row[columnName]);
                }
              });
              arry.push({
                product: e.product_name,
                id: e.id,
                ordered: totalProduct,
              });
            });

            console.log({
              arry: arry,
              contact_person: results2[0].contact_person,
              delivery_point: results2[0].delivery_point,
              phone: results2[0].phone,
              location: results2[0].location,
              province: results2[0].province,
            });

            res.send({
              arry: arry,
              contact_person: results2[0].contact_person,
              delivery_point: results2[0].delivery_point,
              phone: results2[0].phone,
              location: results2[0].location,
              province: results2.province,
            });
          }
        );
      });
    }
  );
});
app.post("/warehousemovement", checkNotAuthenticated, (req, res) => {
  let errors = [];
  let fromDate = req.body.fromDate;
  let toDate = req.body.toDate;
  let warehouse = req.body.warehouse;
  let product = req.body.product;
  pool.query(
    "SELECT stock_id FROM stock WHERE warehouse = ?",
    [warehouse],
    (err, results) => {
      if (err) {
        console.error(err);
        errors.push({ message: err });
        return res.render("warehousemovement", {
          layout: "./layouts/index-layout",
          errors,
          products: [],
          stock: [],
          stock_products: [],
          dispatch: [],
          dispatch_units: [],
        });
      }
      pool.query(
        "SELECT * FROM stock_products WHERE stock_date >= ? AND stock_date <= ?",
        [fromDate, toDate],
        (err, stock_products) => {
          if (err) {
            console.error(err);
            errors.push({ message: err });
            return res.render("warehousemovement", {
              layout: "./layouts/index-layout",
              errors,
              products: [],
              stock: [],
              stock_products: [],
              dispatch: [],
              dispatch_units: [],
            });
          }
          pool.query(
            "SELECT * FROM dispatch WHERE dispatch_date >= ? AND dispatch_date <= ?",
            [fromDate, toDate],
            (err, dispatch) => {
              if (err) {
                console.error(err);
                errors.push({ message: err });
                return res.render("warehousemovement", {
                  layout: "./layouts/index-layout",
                  errors,
                  products: [],
                  stock: [],
                  stock_products: [],
                  dispatch: [],
                  dispatch_units: [],
                });
              }
              let stockResults = [];
              let dispatchResults = [];
              stock_products.forEach((e) => {
                const stockIdMatches = results.some(
                  (result) => result.stock_id === e.stock_id
                );
                if (e.product_name == product && stockIdMatches) {
                  stockResults.push(e);
                }
              });
              dispatch.forEach((e) => {
                if (e.product == product && e.warehouse == warehouse) {
                  dispatchResults.push(e);
                }
              });
              // Combine and sort the results
              const movements = [
                ...stockResults.map((result) => ({
                  ...result,
                  date: result.stock_date,
                })),
                ...dispatchResults.map((result) => ({
                  ...result,
                  date: result.dispatch_date,
                })),
              ];

              movements.sort((a, b) => new Date(a.date) - new Date(b.date));
              console.log(movements);
              res.send({
                movements: movements,
              });
            }
          );
        }
      );
    }
  );
});
app.get("/orderhistory", checkNotAuthenticated, (req, res) => {
  let errors = [];
  let columns = [];
  let arry1 = [];
  pool.query("SELECT * FROM order_book", [], (err, results2) => {
    if (err) {
      console.error(err);
      errors.push({ message: err });
      return res.render("orderhistory", {
        layout: "./layouts/index-layout",
        errors,
      });
    }
    pool.query("SELECT * FROM products", [], (err, results1) => {
      if (err) {
        console.error(err);
        errors.push({ message: err });
        return res.render("orderhistory", {
          layout: "./layouts/index-layout",
          errors,
        });
      }
      pool.query("SHOW COLUMNS FROM order_summary", [], (err, results1b) => {
        if (err) {
          console.error(err);
          errors.push({ message: err });
          return res.render("index", {
            layout: "./layouts/index-layout",
            errors,
            prods: [],
          });
        }
        pool.query("SELECT * FROM unit", [], (err, results1c) => {
          if (err) {
            console.error(err);
            errors.push({ message: err });
            return res.render("index", {
              layout: "./layouts/index-layout",
              errors,
              prods: [],
            });
          }
          pool.query("SELECT * FROM order_summary", [], (err, results3) => {
            if (err) {
              console.error(err);
              errors.push({ message: err });
              return res.render("orderhistory", {
                layout: "./layouts/index-layout",
                errors,
              });
            }
            results1b.forEach((e) => {
              if (
                e.Field != "ser" ||
                e.Field != "id" ||
                e.Field != "unit" ||
                e.Field != "delivery_point"
              ) {
                columns.push(e.Field);
              }
            });
            results3.forEach((q) => {
              let dryCount = 0;
              let perishableCount = 0;
              if (results1) {
                columns.forEach((order) => {
                  // Flag to track if the order has been pushed to any array
                  let orderPushed = false;

                  // Iterate over the products array to find a match for the product name
                  for (product of results1) {
                    // Skip if paramName is id, start_date, end_date, unit, or delivery_point
                    if (
                      ![
                        "id",
                        "start_date",
                        "end_date",
                        "unit",
                        "delivery_point",
                      ].includes(order)
                    ) {
                      // Find a matching product in results3a
                      const matchingProduct = results1.find(
                        (product) =>
                          order === removeSpaces(product.product_name)
                      );

                      // If a matching product is found
                      if (matchingProduct) {
                        // Determine the product type
                        if (matchingProduct.product_type === "Dry Goods") {
                          // Push the order into the dryProducts array if not already added
                          if (!orderPushed) {
                            dryCount += 1;
                            orderPushed = true;
                          }
                        } else if (
                          matchingProduct.product_type === "Perishable"
                        ) {
                          // Push the order into the perishableProducts array if not already added
                          if (!orderPushed) {
                            perishableCount += 1;
                            orderPushed = true;
                          }
                        }
                      }
                    }
                  }
                });
              }
              arry1.push({
                start_date: q.start_date,
                end_date: q.end_date,
                no_of_prods: dryCount + perishableCount,
                num_of_centers: results1c.length,
                dry_goods: dryCount,
                perishables_count: perishableCount,
              });
            });

            res.render("orderhistory", {
              layout: "./layouts/index-layout",
              arry1,
            });
          });
        });
      });
    });
  });
});
app.get("/login", (req, res) => {
  let errors = [];
  res.render("login", { layout: "./layouts/login-layout", errors });
});
app.get("/setpassword", (req, res) => {
  // Extract email and key from query parameters
  let errors = [];
  const email = req.query.email;
  const key = req.query.key;

  // Check if both parameters are present
  if (!email || !key) {
    errors.push("Missing email or key in the query string");
    return res.render("setpassword", {
      layout: "./layouts/login-layout",
      errors,
    });
  }

  console.log(email, key); // Logging for verification

  res.render("setpassword", {
    layout: "./layouts/login-layout",
    errors,
    email,
    key,
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
  let errors = [];
  pool.query("SELECT * FROM unit", [], (err, units) => {
    if (err) {
      console.error(err);
      errors.push({ message: err });
      return res.render("centermovement", {
        layout: "./layouts/index-layout",
        errors,
        units: [],
      });
    }
    res.render("centermovement", {
      layout: "./layouts/index-layout",
      errors,
      units,
    });
  });
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
      res.render("transporter", {
        layout: "./layouts/index-layout",
        errors,
        transporters: [],
        fleet: [],
      });
    }
    pool.query("SELECT * FROM fleet", [], (err, results1) => {
      if (err) {
        console.error(err);
        errors.push({ message: err });
        res.render("transporter", {
          layout: "./layouts/index-layout",
          errors,
          transporters: [],
          fleet: [],
        });
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
      res.render("warehouse", {
        layout: "./layouts/index-layout",
        errors,
        warehouse: [],
      });
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
        const createColumnQuery = `ALTER TABLE order_book ADD COLUMN ${columnName} FLOAT`;
        const createColumnQueryB = `ALTER TABLE order_summary ADD COLUMN ${columnName} FLOAT`;

        // Execute the SQL query
        connection.query(createColumnQuery, (err, results) => {
          if (err) {
            console.error("Error creating column:", err);
            errors.push({ message: err });
            return res.redirect("/products");
          }
          connection.query(createColumnQueryB, (err, results) => {
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
          INSERT INTO stock_products (stock_date, product_name, quantity, unit, stock_id)
          VALUES (?, ?, ?, ?, ?)`,
          [stockDate, product, quantity, unit, stockId],
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
    staffAssigned,
    transporter,
    driver,
    product,
    units,
    status,
    quantity,
    unit,
  } = req.body;
  let yourDate = new Date();
  date_created = formatDate(yourDate);
  pool.query("SELECT * FROM unit", [], (err, unitResults) => {
    pool.query(
      `
      INSERT INTO dispatch (dispatch_date, warehouse, staff_member, transporter, product, status, driver, quantity, unit)
      VALUES (?, ?, ?, ?, ?, ?, ?, ? , ?)
    `,
      [
        dispatchDate,
        warehouse,
        staffAssigned,
        transporter,
        product,
        status,
        driver,
        quantity,
        unit,
      ],
      (err, results) => {
        if (err) {
          // Handle error
          console.error(err);
          errors.push({ message: err });
          return res.redirect("/dispatch");
        }
        const dispatchId = results.insertId;

        for (let productDetail of units) {
          const { formationUnit, quantity, unitMeasure } = productDetail;
          let formation_unit;
          let location;
          let province;
          let delivery_point;
          let contact_person;
          let phone;
          unitResults.forEach((e) => {
            if (e.unit_name == formationUnit) {
              formation_unit = e.unit_name;
              location = e.location;
              province = e.province;
              delivery_point = e.delivery_point;
              contact_person = e.contact_person;
              phone = e.phone;
            }
          });

          pool.query(
            `
          INSERT INTO dispatch_units (formation_unit,location,
            province,
            delivery_point,
            contact_person,
            phone , quantity, unit, dispatch_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              formation_unit,
              location,
              province,
              delivery_point,
              contact_person,
              phone,
              quantity,
              unitMeasure,
              dispatchId,
            ],
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
  const key = req.body.key;
  const password1 = req.body.new_password;
  const password2 = req.body.confirm_password;
  const errors = [];
  console.log(email, key);
  pool.query(
    "SELECT * FROM users WHERE email = ?",
    [email],
    async (err, resultsA) => {
      if (resultsA[0].auth_code == key) {
        if (password1 !== password2) {
          errors.push({ message: "Passwords do not match" });
          return res.render("setpassword", {
            layout: "./layouts/login-layout",
            errors: errors,
          });
        } else {
          const hashedPassword = await bcrypt.hash(password1, 10);
          pool.query(
            "UPDATE users SET password = ?, activated = ?, auth_code = ? WHERE email = ?",
            [hashedPassword, true, makeid(50), email],
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
      } else {
        errors.push({ message: "Password Change Not Authorised" });
        return res.render("setpassword", {
          layout: "./layouts/login-layout",
          errors: errors,
        });
      }
    }
  );
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
    let uid = makeid(12);
    pool.query(
      `UPDATE users SET auth_code = ? WHERE email = ?`,
      [uid, email],
      (err, resul) => {
        if (err) {
          // Handle error
          console.error(err);
          errors.push({ message: err });
          return res.redirect("/stockmanagement");
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
        <a href="https://app.agrifora.co.zw/setpassword?email=${email}&key=${uid}">RESET PASSWORD LINK</a>
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
      }
    );
  });
});

//export Excell
app.get("/export-products", async (req, res) => {
  let errors = [];
  pool.query("SELECT * FROM products", [], async (err, products) => {
    if (err) {
      console.error(err);
      errors.push({ message: err });
      return res.render("products", {
        layout: "./layouts/index-layout",
        errors,
        products: [],
      });
    }

    // Create a new workbook
    const workbook = new exceljs.Workbook();

    // Add a worksheet
    const worksheet = workbook.addWorksheet("Products");

    // Define table headers
    const headers = [
      { header: "ID", key: "id", width: 10 },
      { header: "Product Name", key: "product_name", width: 30 },
      { header: "Description", key: "description", width: 30 },
      { header: "Product Type", key: "product_type", width: 20 },
      { header: "Unit", key: "unit", width: 15 },
      { header: "Alternative Unit", key: "alternative_unit", width: 20 },
      { header: "Conversion Factor", key: "conversion_factor", width: 20 },
      { header: "Reorder Level", key: "reorder_level", width: 15 },
    ];

    // Add headers to the worksheet
    worksheet.columns = headers;

    // Add data rows to the worksheet
    products.forEach((product) => {
      worksheet.addRow(product);
    });

    // Write the workbook to a file and export
    workbook.xlsx
      .writeFile("Products-Report.xlsx")
      .then(() => {
        console.log("Excel file created successfully!");
        // Provide the file for download
        res.download("Products-Report.xlsx");
      })
      .catch((err) => {
        console.error("Error writing Excel file:", err);
      });
  });
});
app.get("/export-stock-card", async (req, res) => {
  // Create a new workbook
  const workbook = new exceljs.Workbook();

  // Add a worksheet
  const worksheet = workbook.addWorksheet("Stock Card");

  // Get modal data
  const requesterSummary =
    document.getElementById("requesterSummary1").innerHTML;
  const replaceTable = document.getElementById("replaceTable1");

  // Write requester summary to worksheet
  worksheet.addRow([requesterSummary]);

  // Write table headers to worksheet
  worksheet.addRow(["#", "Product", "Unit Measure", "Quantity"]);

  // Iterate over table rows and write data to worksheet
  replaceTable.querySelectorAll("tr").forEach((row) => {
    const rowData = [];
    row.querySelectorAll("td").forEach((cell) => {
      rowData.push(cell.textContent);
    });
    worksheet.addRow(rowData);
  });

  // Generate the Excel file
  workbook.xlsx
    .writeBuffer()
    .then((buffer) => {
      // Convert buffer to Blob
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      // Create download link
      const downloadLink = document.createElement("a");
      downloadLink.href = window.URL.createObjectURL(blob);
      downloadLink.download = "Stock_Card.xlsx";
      // Trigger download
      downloadLink.click();
    })
    .catch((error) => {
      console.error("Error exporting Excel:", error);
      alert("Error exporting Excel. Please try again.");
    });
});
// Multer setup for file upload
const upload = multer();

// Route to handle file upload
app.post("/upload-excel", upload.single("excelFile"), (req, res) => {
  const { start_date, end_date } = req.body;
  let errors = [];

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

      // Initialize array to hold sums for each column
      const columnSums = Array(headers.length).fill(0);

      // Iterate over each row in the worksheet
      worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        if (rowNumber > 1) {
          // Skip header row
          const rowData = row.values.slice(1); // Exclude the first value which is assumed to be the ID

          // Iterate over each value in the row
          rowData.forEach((quantity, columnIndex) => {
            // Check if the value is a number and add it to the corresponding column sum
            if (!isNaN(quantity)) {
              columnSums[columnIndex] += quantity;
            }
          });

          // Insert data into the database (order_book table)
          const nonEmptyHeaders = headers.filter((header) => header); // Filter out empty headers
          const placeholders = Array(nonEmptyHeaders.length)
            .fill("?")
            .join(", ");
          const sql = `INSERT INTO order_book (start_date, end_date, ${nonEmptyHeaders.join(
            ","
          )}) VALUES (?, ?, ${placeholders})`;
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

      // Insert summary of order into order_summary table
      const placeholdersSummary = Array(columnSums.length - 4).fill("?");
      const valuesSummary = [
        formatDate(start_date),
        formatDate(end_date),
        ...columnSums.slice(3, -1), // Exclude the last value
      ];

      pool.query(
        `INSERT INTO order_summary (start_date, end_date, ${headers
          .filter((header) => header)
          .slice(3)
          .join(", ")})
        VALUES (?, ?, ${placeholdersSummary.join(", ")})`,
        valuesSummary,
        (error, resultsSummary) => {
          if (error) {
            console.error("Error inserting order summary:", error);
            return res.status(500).send("Error inserting order summary.");
          } else {
            console.log("Order summary inserted successfully.");
          }
        }
      );

      // Insert order book dates
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
            return res.status(500).send("Error inserting order book dates.");
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
function makeid(length) {
  let result = "";
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const charactersLength = characters.length;
  let counter = 0;
  while (counter < length) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
    counter += 1;
  }
  return result;
}
function checkNotAuthenticated(req, res, next) {
  if (req.session.email == null) {
    authed = true;
    return next();
  }
  authed = false;
  res.redirect("/login");
}

app.listen(PORT, console.log(`Server running on port ${PORT}`));
