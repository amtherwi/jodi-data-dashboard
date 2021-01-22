const fs = require('fs');
const CsvReadableStream = require('csv-reader');
const sqlite3 = require('sqlite3').verbose();
const readCSV = require('./readCSV');
const path = require('path');
const { type } = require('os');

const file = "./data/csv/world_primary_15_38407562524788.csv";
let db = new sqlite3.Database('./data/jodi_oil_B_Exports_15M.db', (err) => {
    if (err) {
        console.error(err.message);
    }
});

const tableName = path.basename(file, '.csv');
const createQuery = `CREATE TABLE IF NOT EXISTS ${tableName}(Id INTEGER PRIMARY KEY AUTOINCREMENT, country TEXT NOT NULL, monthYear TEXT NOT NULL, value INTEGER);`;

let jodiDb = []
let inputStream = fs.createReadStream(file, 'utf8');
let time = []
let countrywithValue = []

inputStream
    .pipe(new CsvReadableStream({
        parseNumbers: true,
        parseBooleans: true,
        trim: true,
    }))
    .on('data', function (row) {
        let newRow = []
        if (row[0] === "Time") {
            newRow = [...row]
            row.shift()
            time = [...row]
            //console.log(time);
        }
        if (row.length > 3 && newRow[0] != "Time") {
            countrywithValue.push(row)
        }
    })
    .on('end', function (data) {
        //console.log('No more rows!');

        // clean our data to the form country|monthYear|value
        countrywithValue.forEach((item, index) => {
            time.forEach((t, i) => {
                const countery = {
                    country: item[0],
                    monthYear: t,
                    value: item[i + 1]
                }
                jodiDb.push(countery);
            })
        })
        //construct the insert statement with multiple placeholders
        //based on the number of rows
        const cols = Object.keys(jodiDb[0]).join(", ");
        const placeholders = Object.keys(jodiDb[0]).fill('?').join(", ");
        
        //console.log("cols" + cols)
        //console.log("placeholder" + placeholders)
        let sql = `INSERT INTO ${tableName}(${cols}) VALUES (` + placeholders + ')';

        // db operation 
        db.serialize(() => {
            db.prepare(createQuery, (err) => {
                if (err) {
                    return console.log(err.message)
                }
                console.log(`Table ${tableName} created!`);
            }).run().finalize();

            // innsert rows into db 
            jodiDb.forEach(item => {
                //console.log(Object.values((item)))
                db.run(sql, Object.values((item)), (err) => {
                    if (err) {
                        return console.error(err.message);
                    }
                });
            })
        })
        console.log(`Rows inserted`);
        //close the database connection
        // close the database connection
        db.close((err) => {
            if (err) {
                return console.error(err.message);
            }
        });
        //
        //console.log(time)
        //console.log(countrywithValue)
        //console.log(jodiDb) 
    });



