var app = require("./app");
var chaiHttp = require('chai-http');
var request = require("request");
var chai = require('chai');
var should = chai.should();
chai.use(chaiHttp);
var url = "http://localhost:3000";

describe("Test API", function(){
	describe("Get User Schema", function() {
	    it("get user infomation", function(done) {
	        chai.request(url)
                .get('/user?userName=driver')
                .end(function (err, res) {
                    res.should.have.status(200);
                    res.should.be.json;
                    res.body[0].should.have.property('userName');
                    res.body[0].should.have.property('email');
                    done();
                });
	    });
		it('Create a new user', function (done) {
		    chai.request(url)
              .post('/user')
              .send({ "userName": "test", "email": "thisistest@myapp.com", "password": "132" })
              .end(function (err, res) {
                  res.should.have.status(200);
                  done();
              })
		});
        
		it('update email and password', function (done) {
		    chai.request(url)
              .put('/user/test')
              .send({ 'email': '34567@email.com', 'password':'123456' })
              .end(function (error, response) {
                  response.should.have.status(200);
                  done();
                });
		});
		it('delete user', function (done) {
		    chai.request(url)
              .delete('/user/test')
              .end(function (error, response) {
                  response.should.have.status(200);
                  done();
              });
		});
	});
	describe("Put User Schema", function() {
		
	});

});