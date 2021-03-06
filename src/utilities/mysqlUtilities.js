// @Vendors
const mysql = require('mysql');

// @Constants
const {
    MYSQL_MULTIPLE_STATEMENTS,
    SERVER_DB_QUOTED_TYPE,
    SERVER_DB_NON_QUOTED_TYPE
} = require('../constants');

const mysqlConnection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'n1nj4r4c3',
    database: 'ninjaRaceDB',
    multipleStatements: MYSQL_MULTIPLE_STATEMENTS 
});

const selectStatement = (table, condition, ...fields) => {
    const whereClause = condition ? `WHERE ${condition}` : '';
    let fieldsClause = '*';
    if(fields.length) {
        fieldsClause = '';
        fields.forEach(field => {
            fieldsClause += `${field}, `;
        });
        fieldsClause = fieldsClause.slice(0, -2);
    }
    return `SELECT ${fieldsClause} FROM ${table} ${whereClause};`;
}

const insertStatement = (table, cols, values) => {
    let colsClause;
    let valuesClause;
    if(cols.length) {
        colsClause = '(';
        cols.forEach(col => {
            colsClause += `${col}, `;
        })
        colsClause = `${colsClause.slice(0, -2)})`;
    }
    if(values.length) {
        valuesClause = '(';
        values.forEach(value => {
            switch(value.type) {
                case SERVER_DB_QUOTED_TYPE:
                    valuesClause += `'${value.data}'`;
                    break;
                case SERVER_DB_NON_QUOTED_TYPE:
                    valuesClause += `${value.data}`;
                    break;
                default:
                    break;
            }
            valuesClause += ', ';
        })
        valuesClause = `${valuesClause.slice(0, -2)})`;
    }
    return `INSERT INTO ${table} ${colsClause} VALUES ${valuesClause};`;
}

const updateStatement = (table, condition, values) => {
    let setValues = [];
    let setClause;

    if(values.length) {
        values.forEach(value => {
            switch(value.type) {
                case SERVER_DB_QUOTED_TYPE:
                    setValues.push(`${value.col} = '${value.value}'`);
                    break;
                case SERVER_DB_NON_QUOTED_TYPE:
                    setValues.push(`${value.col} = ${value.value}`);
                    break;
                default:
                    break;
            }
        });
        setClause = setValues.join(',');
    }

    return `UPDATE ${table} SET ${setClause} WHERE ${condition}`;
}

const mysqlQuery = (query, callback) => {
    mysqlConnection.query(query, (err, results) => {
        const response = {
            error: false,
            data: {}
        };

        if(err) {
            response.error = true;
        } else {
            response.data = results
        }
        callback(response);
    })
}



module.exports = {
    selectStatement,
    insertStatement,
    mysqlQuery,
    updateStatement
};
