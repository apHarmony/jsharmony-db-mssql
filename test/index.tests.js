/*
Copyright 2022 apHarmony

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

var JSHdb = require('jsharmony-db');
var moment = require('moment');
var assert = require('assert');

exports = module.exports = function(db){

  var tempTable = "IF OBJECT_ID('tempdb.dbo.#c', 'U') is not null drop table #c; create table #c(c_id bigint); insert into #c(c_id) values (1);insert into #c(c_id) values (2);insert into #c(c_id) values (3);";
  var globalTable = "IF OBJECT_ID('tempdb.dbo.##jsh_c', 'U') IS NOT NULL DROP TABLE ##jsh_c; create table ##jsh_c(c_id bigint); insert into ##jsh_c(c_id) values (1);insert into ##jsh_c(c_id) values (2);insert into ##jsh_c(c_id) values (3);";

  describe('Basic',function(){
    it('Select Parameter', function (done) {
      //Connect to database and get data
      var c_id = '1';
      db.Recordset('','select @c_id c_id',[JSHdb.types.BigInt],{'c_id': c_id},function(err,rslt){
        assert(!err,'Success');
        assert((rslt && rslt.length && (rslt[0].c_id==c_id)),'Parameter returned correctly');
        return done();
      });
    });
    it('Scalar', function (done) {
      //Connect to database and get data
      db.Scalar('',tempTable + 'select count(*) from #c',[],{},function(err,rslt){
        assert(!err,'Success');
        assert(rslt==3,'Scalar correct');
        return done();
      });
    });
    it('Row', function (done) {
      //Connect to database and get data
      var c_id = '1';
      db.Row('',tempTable+'select * from #c where c_id=@c_id;',[JSHdb.types.BigInt],{'c_id': c_id},function(err,rslt){
        assert(!err,'Success');
        assert(rslt && (rslt.c_id==c_id),'Recordset correct');
        return done();
      });
    });
    it('Recordset', function (done) {
      //Connect to database and get data
      db.Recordset('',tempTable+'select * from #c;',[],{},function(err,rslt){
        assert(!err,'Success');
        assert(rslt && rslt.length && (rslt.length==3) && (rslt[0].c_id==1),'Recordset correct');
        return done();
      });
    });
    it('MultiRecordset', function (done) {
      //Connect to database and get data
      db.MultiRecordset('',tempTable+'select * from #c;select count(*) cnt from #c;',[],{},function(err,rslt){
        assert(!err,'Success');
        assert(rslt && rslt.length && (rslt.length==2),'Multiple recordsets returned');
        assert(rslt[0] && (rslt[0].length==3) && (rslt[0][0].c_id==1),'Recordset 1 correct');
        assert(rslt[1] && (rslt[1].length==1) && (rslt[1][0].cnt==3),'Recordset 2 correct');
        return done();
      });
    });
    it('Error', function (done) {
      //Connect to database and get data
      db.Row('','select b;',[],{},function(err,rslt){
        assert(err,'Success');
        return done();
      });
    });
    it('Transact-SQL', function (done) {
      //Connect to database and get data
      db.Scalar('',tempTable+"declare @a bigint = 1;\
                    BEGIN\
                      set @a = @a + 1;\
                      set @a = @a + 1;\
                      select @a = @a + 1;\
                      insert into #c(c_id) values (@a);\
                    end\
                    select top 1 c_id from #c order by c_id desc;\
                    delete from #c where c_id=4;",[],{},function(err,rslt){
        assert(!err,'Success');
        assert(rslt==4,'Result correct');
        return done();
      });
    });
    it('Application Error', function (done) {
      //Connect to database and get data
      db.Command('',"raiserror ('Application Error - Test Error',16,1);",[],{},function(err,rslt){
        assert(err,'Success');
        return done();
      });
    });
    it('Application Warning', function (done) {
      //Connect to database and get data
      db.Scalar('',"raiserror ('Test warning',10,1);",[],{},function(err,rslt,stats){
        assert(!err,'Success');
        assert(stats.warnings && stats.warnings.length,'Warning generated');
        assert(stats.notices && !stats.notices.length,'No notice generated');
        assert((stats.warnings[0].message=='Test warning') && (stats.warnings[0].severity=='WARNING'),'Warning valid');
        return done();
      });
    });
    
    it('Application Notice', function (done) {
      //Connect to database and get data
      db.Scalar('',"print 'Test notice';",[],{},function(err,rslt,stats){
        assert(!err, 'Success');
        assert(stats.notices && stats.notices.length,'Notice generated');
        assert(stats.notices && !stats.warnings.length,'No warnings generated');
        assert((stats.notices[0].message=='Test notice') && (stats.notices[0].severity=='NOTICE'),'Notice valid');
        return done();
      });
    });

    it('Context', function (done) {
      //Connect to database and get data
      db.Scalar('CONTEXT',"select context_info();",[],{},function(err,rslt){
        assert(rslt && (rslt.toString().substr(0,7)=='CONTEXT'),'Context found');
        return done();
      });
    });
    it('No transaction in progress', function (done) {
      //Connect to database and get data
      db.Scalar('',"select @@TRANCOUNT;",[],{},function(err,rslt){
        assert(!rslt,'No transaction in progress');
        return done();
      });
    });
    it('Create global table', function (done) {
      //Connect to database and get data
      db.Scalar('',globalTable,[],{},function(err,rslt){
        assert(!err,'Success');
        return done();
      });
    });
    
    it('Bad Transaction', function (done) {
      //Connect to database and get data
      db.ExecTransTasks({
        task1: function(dbtrans, callback, transtbl){
          db.Command('','insert into ##jsh_c(c_id) values(4);',[],{},dbtrans,function(err,rslt){ callback(err, rslt); });
        },
        task2: function(dbtrans, callback, transtbl){
          db.Scalar('','select @@TRANCOUNT',[],{},dbtrans,function(err,rslt){ assert(rslt==1,'Transaction in progress'); callback(err, rslt); });
        },
        task3: function(dbtrans, callback, transtbl){
          db.Recordset('','select * from ##jsh_c',[],{},dbtrans,function(err,rslt){ assert(rslt && (rslt.length==4),'Row count correct'); callback(err, rslt); });
        },
        task4: function(dbtrans, callback, transtbl){
          db.Recordset('',"raiserror ('Application Error - Test Error',11,1);",[],{},dbtrans,function(err,rslt){ callback(err, rslt); });
        },
        task5: function(dbtrans, callback, transtbl){
          db.Command('','rollback transaction;',[],{},dbtrans,function(err,rslt){ callback(err, rslt); });
        },
        task6: function(dbtrans, callback, transtbl){
          db.Scalar('','insert into ##jsh_c(c_id) values(5);',[],{},dbtrans,function(err,rslt){ callback(err, rslt); });
        },
        task7: function(dbtrans, callback, transtbl){
          db.Scalar('','select @@TRANCOUNT',[],{},dbtrans,function(err,rslt){ assert(rslt==1,'Transaction in progress'); callback(err, rslt); });
        },
      },function(err,rslt){
        assert(err,'Rollback generated an error');
        assert(err.message=='Application Error - Test Error','Correct error message');
        return done();
      });
    });

    it('Transaction Rolled back', function (done) {
      //Connect to database and get data
      db.Scalar('','select count(*) from ##jsh_c',[],{},function(err,rslt){
        assert(!err,'Success');
        assert(rslt==3,'Row count correct');
        return done();
      });
    });

    it('Good Transaction', function (done) {
      //Connect to database and get data
      db.ExecTransTasks({
        task1: function(dbtrans, callback, transtbl){
          db.Command('','insert into ##jsh_c(c_id) values(4);',[],{},dbtrans,function(err,rslt){ callback(err, rslt); });
        },
        task2: function(dbtrans, callback, transtbl){
          db.Scalar('','select @@TRANCOUNT',[],{},dbtrans,function(err,rslt){ assert(rslt==1,'Transaction in progress'); callback(err, rslt); });
        },
        task3: function(dbtrans, callback, transtbl){
          db.Command('',"raiserror ('Test warning',10,1);",[],{},dbtrans,function(err,rslt,stats){ callback(err, rslt, stats); });
        },
        task4: function(dbtrans, callback, transtbl){
          db.Command('',"print 'Test notice';",[],{},dbtrans,function(err,rslt,stats){ callback(err, rslt, stats); });
        },
        task5: function(dbtrans, callback, transtbl){
          db.Recordset('',"select count(*) count from ##jsh_c",[],{},dbtrans,function(err,rslt,stats){ callback(err, rslt, stats); });
        },
      },function(err,rslt,stats){
        assert(!err,'Success');
        assert((rslt.task5.length==1)&&(rslt.task5[0].count==4),'Correct result');
        assert((stats.task3.warnings[0].message=='Test warning'),'Warning generated');
        assert((stats.task4.notices[0].message=='Test notice'),'Notice generated');
        return done();
      });
    });

    it('Transaction Committed', function (done) {
      //Connect to database and get data
      db.Scalar('','select count(*) from ##jsh_c',[],{},function(err,rslt){
        assert(!err,'Success');
        assert(rslt==4,'Row count correct');
        return done();
      });
    });
    it('Drop global table', function (done) {
      //Connect to database and get data
      db.Scalar('',"drop table ##jsh_c",[],{},function(err,rslt){
        assert(!err,'Success');
        return done();
      });
    });
    it('ExecTasks - One item', function (done) {
      //Connect to database and get data
      db.ExecTasks([
        function(callback){
          db.Recordset('','select 1 a;',[],{},undefined,function(err,rslt,stats){ callback(err, rslt, stats); });
        }
      ],function(err,rslt,stats){
        assert(!err,'Success');
        assert(rslt&&(rslt.length==1)&&(rslt[0].length==1)&&(rslt[0][0].a==1),'Correct result');
        return done();
      });
    });
    it('ExecTasks - Parallel', function (done) {
      //Connect to database and get data
      db.ExecTasks({
        task1: function(callback){
          db.Recordset('','select 1 a;',[],{},undefined,function(err,rslt,stats){ callback(err, rslt, stats); });
        },
        task2: function(callback){
          db.Recordset('','select 2 b;',[],{},undefined,function(err,rslt,stats){ callback(err, rslt, stats); });
        },
        task3: function(callback){
          db.Command('',"raiserror ('Test warning',10,1);",[],{},undefined,function(err,rslt,stats){ callback(err, rslt, stats); });
        },
        task4: function(callback){
          db.Command('',"print 'Test notice';",[],{},undefined,function(err,rslt,stats){ callback(err, rslt, stats); });
        },
      },function(err,rslt,stats){
        assert(!err,'Success');
        assert((rslt.task1.length==1)&&(rslt.task1[0].a==1),'Correct result');
        assert((stats.task3.warnings[0].message=='Test warning'),'Warning generated');
        assert((stats.task4.notices[0].message=='Test notice'),'Notice generated');
        return done();
      });
    });
    it('ExecTasks - Serial & Parallel', function (done) {
      //Connect to database and get data
      var dbtasks = [{}, {}];
      dbtasks[0] = {
        task11: function(callback){
          db.Recordset('','select 1 a;',[],{},undefined,function(err,rslt,stats){ callback(err, rslt, stats); });
        },
        task12: function(callback){
          db.Recordset('','select 2 b;',[],{},undefined,function(err,rslt,stats){ callback(err, rslt, stats); });
        },
        task13: function(callback){
          db.Command('',"raiserror ('Test warning',10,1);",[],{},undefined,function(err,rslt,stats){ callback(err, rslt, stats); });
        },
        task14: function(callback){
          db.Command('',"print 'Test notice';",[],{},undefined,function(err,rslt,stats){ callback(err, rslt, stats); });
        },
      };
      dbtasks[1] = {
        task21: function(callback,dbrslt){
          assert(dbrslt.task11 && dbrslt.task11[0] && (dbrslt.task11[0].a==1),'Series execution worked');
          db.Recordset('','select 1 a;',[],{},undefined,function(err,rslt,stats){ callback(err, rslt, stats); });
        },
        task22: function(callback){
          db.Recordset('','select 2 b;',[],{},undefined,function(err,rslt,stats){ callback(err, rslt, stats); });
        },
        task23: function(callback){
          db.Command('',"raiserror ('Test warning2',10,1);",[],{},undefined,function(err,rslt,stats){ callback(err, rslt, stats); });
        },
        task24: function(callback){
          db.Command('',"print 'Test notice2';",[],{},undefined,function(err,rslt,stats){ callback(err, rslt, stats); });
        },
      };
      db.ExecTasks(dbtasks, function(err,rslt,stats){
        assert(!err,'Success');
        assert((rslt.task11.length==1)&&(rslt.task11[0].a==1),'Correct result');
        assert((rslt.task21.length==1)&&(rslt.task21[0].a==1),'Correct result');
        assert((stats.task13.warnings[0].message=='Test warning'),'Warning generated');
        assert((stats.task14.notices[0].message=='Test notice'),'Notice generated');
        assert((stats.task23.warnings[0].message=='Test warning2'),'Warning2 generated');
        assert((stats.task24.notices[0].message=='Test notice2'),'Notice2 generated');
        return done();
      });
    });
    it('ExecTasks - Serial & Parallel Array', function (done) {
      //Connect to database and get data
      var dbtasks = [{}, {}];
      dbtasks[0] = [
        function(callback){
          db.Recordset('','select 1 a;',[],{},undefined,function(err,rslt,stats){ callback(err, rslt, stats); });
        },
        function(callback){
          db.Recordset('','select 2 b;',[],{},undefined,function(err,rslt,stats){ callback(err, rslt, stats); });
        },
        function(callback){
          db.Command('',"raiserror ('Test warning',10,1);",[],{},undefined,function(err,rslt,stats){ callback(err, rslt, stats); });
        },
        function(callback){
          db.Command('',"print 'Test notice';",[],{},undefined,function(err,rslt,stats){ callback(err, rslt, stats); });
        },
      ];
      dbtasks[1] = [
        function(callback,dbrslt){
          assert(dbrslt[0] && dbrslt[0][0] && (dbrslt[0][0].a==1),'Series execution worked');
          db.Recordset('','select 1 a;',[],{},undefined,function(err,rslt,stats){ callback(err, rslt, stats); });
        },
        function(callback){
          db.Recordset('','select 2 b;',[],{},undefined,function(err,rslt,stats){ callback(err, rslt, stats); });
        },
        function(callback){
          db.Command('',"raiserror ('Test warning2',10,1);",[],{},undefined,function(err,rslt,stats){ callback(err, rslt, stats); });
        },
        function(callback){
          db.Command('',"print 'Test notice2';",[],{},undefined,function(err,rslt,stats){ callback(err, rslt, stats); });
        },
      ];
      db.ExecTasks(dbtasks, function(err,rslt,stats){
        assert(!err,'Success');
        assert((rslt[0].length==1)&&(rslt[0][0].a==1),'Correct result');
        assert((rslt[4].length==1)&&(rslt[4][0].a==1),'Correct result');
        assert((stats[2].warnings[0].message=='Test warning'),'Warning generated');
        assert((stats[3].notices[0].message=='Test notice'),'Notice generated');
        assert((stats[6].warnings[0].message=='Test warning2'),'Warning2 generated');
        assert((stats[7].notices[0].message=='Test notice2'),'Notice2 generated');
        return done();
      });
    });
    it('DB Script Notices', function (done) {
      db.SQLExt.Scripts['test'] = {};
      db.SQLExt.Scripts['test']['dropfakedb'] = ["IF EXISTS (SELECT 1 FROM sys.databases WHERE [name] = N'fakedbthatdoesnotexist') drop database fakedbthatdoesnotexist"];
      db.RunScripts(db.platform, ['test','dropfakedb'],{},function(err,rslt,stats){
        assert(!err,'Success');
        return done();
      });
    });
    it('Date passthru', function (done) {
      //Connect to database and get data
      db.Scalar('','select convert(varchar,cast(@dt as date),101)',[JSHdb.types.Date],{'dt': moment('2018-12-03').toDate()},function(err,rslt){
        assert(!err,'Success');
        assert(rslt=='12/03/2018','Date passthru');
        return done();
      });
    });
    it('DateTime passthru', function (done) {
      //Connect to database and get data
      db.Scalar('','select convert(varchar,cast(@dt as date),101)',[JSHdb.types.DateTime(7)],{'dt': moment('2018-12-03').toDate()},function(err,rslt){
        assert(!err,'Success');
        assert(rslt=='12/03/2018','Date passthru');
        return done();
      });
    });
    it('Bulk Create', function (done) {
      //Connect to database and get data
      var tblData = {
        name: '##jsh_c',
        columns: [
          { name: 'c_id', type: JSHdb.types.BigInt, options: {nullable: false, primary: true} },
          { name: 'c_name', type: JSHdb.types.VarChar(64), options: {nullable: false} },
          { name: 'c_desc', type: JSHdb.types.VarChar(64), options: {nullable: true} },
        ],
        data: [
          [1, 'John Smith', null],
          [2, 'John Denver', 'Singer'],
          [3, 'John Prince', 'Prince'],
          [4, 'John Donne', 'Poet'],
        ],
      };
      db.BulkCreate('',tblData,[],{},function(err,rslt){
        assert(!err,'Success');
        return done();
      });
    });
    it('Bulk Insert', function (done) {
      //Connect to database and get data
      var tblData = {
        name: '##jsh_c',
        columns: [
          { name: 'c_id', type: JSHdb.types.BigInt, options: {nullable: false, primary: true} },
          { name: 'c_name', type: JSHdb.types.VarChar(64), options: {nullable: false} },
          { name: 'c_desc', type: JSHdb.types.VarChar(64), options: {nullable: true} },
        ],
        data: [
          [5, 'Jack 1', null],
          [7, 'Jack 2', null],
          [8, 'Jack 3', 'Third'],
          [9, 'Jack 4', 'Fourth'],
        ],
      };
      db.BulkInsert('',tblData,[],{},function(err,rslt){
        assert(!err,'Success');
        return done();
      });
    });
    it('Verify Bulk', function (done) {
      //Connect to database and get data
      db.Recordset('','select * from ##jsh_c;',[],{},function(err,rslt){
        assert(!err,'Success');
        var cmpData = [
          { c_id: '1', c_name: 'John Smith', c_desc: null },
          { c_id: '2', c_name: 'John Denver', c_desc: 'Singer' },
          { c_id: '3', c_name: 'John Prince', c_desc: 'Prince' },
          { c_id: '4', c_name: 'John Donne', c_desc: 'Poet' },
          { c_id: '5', c_name: 'Jack 1', c_desc: null },
          { c_id: '7', c_name: 'Jack 2', c_desc: null },
          { c_id: '8', c_name: 'Jack 3', c_desc: 'Third' },
          { c_id: '9', c_name: 'Jack 4', c_desc: 'Fourth' }
        ];
        assert(rslt && (JSON.stringify(cmpData) == JSON.stringify(rslt)),'Recordset correct');
        return done();
      });
    });
    it('Drop bulk table', function (done) {
      //Connect to database and get data
      db.Scalar('',"drop table ##jsh_c",[],{},function(err,rslt){
        assert(!err,'Success');
        return done();
      });
    });
    after(function(done){
      assert(db.dbconfig._driver.pool.length==1,'Pool exists');
      assert(db.dbconfig._driver.pool[0].isConnected,'Pool connected');
      db.Close(function(){
        assert(!db.dbconfig._driver.pool[0].isConnected,'Pool closed');
        return done();
      });
    });
  });
};