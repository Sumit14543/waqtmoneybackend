import { validateOfficialEmail } from "../services/emailValidation.service.js";

export const validateOfficialEmailController = async (req, res, next) => {
  try {
    const { email } = req.body || {};
    const result = await validateOfficialEmail(email);

    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
