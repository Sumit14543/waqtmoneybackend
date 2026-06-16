import { createLoan } from "../services/loan.service.js";

export const addLoan = async (req, res, next) => {
  try {
    const { amount, purpose, hasLoan } = req.body;

    if (amount == null || purpose == null || hasLoan == null || hasLoan === "") {
      return res.status(400).json({ message: "All fields required" });
    }

    const result = await createLoan(req.body);

    res.status(201).json({
      success: true,
      message: "Loan saved",
      data: { id: req.body.id || result.insertId },
    });
  } catch (err) {
    next(err);
  }
};
