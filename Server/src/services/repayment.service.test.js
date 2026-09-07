import test from "node:test";
import assert from "node:assert/strict";
import { buildRepaymentApplicationFromCRM } from "./repayment.service.js";

test("buildRepaymentApplicationFromCRM handles single disbursed CRM lead object", () => {
  const crmStatus = {
    sourceLeadId: "176",
    loanId: "LNWQTMN00176",
    statusCode: "disbursed",
    phone: "9764035668",
    customerName: "RAJ OMPRAKASH SHASTRI",
    disbursement: {
      disbursedAmount: 8820,
    },
    repayment: {
      totalAmount: 20900,
      balanceAmount: 20900,
      dueDate: "2026-06-01",
    },
  };

  const result = buildRepaymentApplicationFromCRM("LNWQTMN00176", null, crmStatus);
  assert.notEqual(result, null);
  assert.equal(result.loan_id, "LNWQTMN00176");
  assert.equal(result.full_name, "RAJ OMPRAKASH SHASTRI");
  assert.equal(result.disbursed_amount, 8820);
  assert.equal(result.outstanding_amount, 20900);
});

test("buildRepaymentApplicationFromCRM handles array of CRM leads and picks disbursed/overdue lead", () => {
  const crmStatusArray = [
    {
      sourceLeadId: "100",
      statusCode: "pending",
      phone: "9764035668",
    },
    {
      sourceLeadId: "176",
      loanId: "LNWQTMN00176",
      statusCode: "overdue",
      phone: "9764035668",
      customerName: "RAJ OMPRAKASH SHASTRI",
      disbursement: {
        disbursed_amount: 8820,
      },
      repayment: {
        totalAmount: 20900,
        balanceAmount: 20900,
      },
    },
  ];

  const result = buildRepaymentApplicationFromCRM("9764035668", null, crmStatusArray);
  assert.notEqual(result, null);
  assert.equal(result.loan_id, "LNWQTMN00176");
  assert.equal(result.full_name, "RAJ OMPRAKASH SHASTRI");
  assert.equal(result.disbursed_amount, 8820);
});
