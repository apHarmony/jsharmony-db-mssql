/*
Copyright 2020 apHarmony

This file is part of jsHarmony.

jsHarmony is free software: you can redistribute it and/or modify
it under the terms of the GNU Lesser General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

jsHarmony is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Lesser General Public License for more details.

You should have received a copy of the GNU Lesser General Public License
along with this package.  If not, see <http://www.gnu.org/licenses/>.
*/

var JSHmssql = require('../index');
var JSHdb = require('jsharmony-db');
var shouldBehaveLikeAnObject = require('jsharmony-db/test/shared/objects');
var path = require('path');
var fs = require('fs');
var _ = require('lodash');
var os = require('os');

var dbconfig = { };

var path_TestDBConfig = path.join(os.homedir(),'jsharmony/testdb_mssql.json');
if(fs.existsSync(path_TestDBConfig)){
  dbconfig = JSON.parse(fs.readFileSync(path_TestDBConfig,'utf8'));
  console.log('\r\n==== Loading test database config ====\r\n'+JSON.stringify(dbconfig,null,4)+'\r\n');
}

dbconfig = _.extend({_driver: new JSHmssql(), host: "server.domain.com", database: "DBNAME", user: "DBUSER", password: "DBPASS", options: { pooled: true }, pool: { max: 1 } },dbconfig);
var db = new JSHdb(dbconfig);

describe('MSSQL Objects',function(){
  var rowcountSql = function(sql) {
    return sql + ';\nselect @@rowcount as xrowcount';
  };
  shouldBehaveLikeAnObject(db, JSHdb, "'2020-07-07'", '2020-07-07T00:00:00.000', rowcountSql);
});