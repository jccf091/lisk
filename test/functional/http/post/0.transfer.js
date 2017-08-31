'use strict';

var node = require('../../../node');
var shared = require('./shared');
var constants = require('../../../../helpers/constants');

var sendTransaction = require('../../../common/complexTransactions').sendTransaction;
var sendTransactionPromise = node.Promise.promisify(sendTransaction);

describe('POST /api/transactions (type 0) transfer funds', function () {

	var badTransactions = [];
	var goodTransactions = [];

	describe('schema validations', function () {

		shared.invalidTxs();
	});

	describe('transaction processing', function () {

		var account = node.randomAccount();
		var goodTransaction = node.randomTx();

		it('using zero amount should fail', function () {
			var transaction = node.lisk.transaction.createTransaction(account.address, 0, node.gAccount.password);

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('message').to.equal('Invalid transaction amount');
				badTransactions.push(transaction);
			});
		});

		it('when sender has no funds should fail', function () {
			var transaction = node.lisk.transaction.createTransaction('1L', 1, account.password);

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('message').to.equal('Account does not have enough LSK: ' + account.address + ' balance: 0');
				badTransactions.push(transaction);
			});
		});

		it('using entire balance should fail', function () {
			var transaction = node.lisk.transaction.createTransaction(account.address, Math.floor(node.gAccount.balance), node.gAccount.password);

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('message').to.match(/^Account does not have enough LSK: [0-9]+L balance: /);
				badTransactions.push(transaction);
			});
		});

		it('from the genesis account should fail', function () {
			var signedTransactionFromGenesis = {
				type: 0,
				amount: 1000,
				senderPublicKey: 'c96dec3595ff6041c3bd28b76b8cf75dce8225173d1bd00241624ee89b50f2a8',
				requesterPublicKey: null,
				timestamp: 24259352,
				asset: {},
				recipientId: node.eAccount.address,
				signature: 'f56a09b2f448f6371ffbe54fd9ac87b1be29fe29f27f001479e044a65e7e42fb1fa48dce6227282ad2a11145691421c4eea5d33ac7f83c6a42e1dcaa44572101',
				id: '15307587316657110485',
				fee: 10000000
			};

			return sendTransactionPromise(signedTransactionFromGenesis).then(function (res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('message').equals('Invalid sender. Can not send from genesis account');
				badTransactions.push(signedTransactionFromGenesis);
			});
		});

		it('when sender has funds should be ok', function () {
			return sendTransactionPromise(goodTransaction).then(function (res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('transactionId').to.equal(goodTransaction.id);
				goodTransactions.push(goodTransaction);
			});
		});

		it('sending transaction with same id twice should fail', function () {
			return sendTransactionPromise(goodTransaction).then(function (res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('message').to.equal('Transaction is already processed: ' + goodTransaction.id);
			});
		});
	});

	describe('transaction confirmations', function () {

		shared.confirmationPhase(goodTransactions, badTransactions);
	});
});