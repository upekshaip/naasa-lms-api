import bcrypt from 'bcrypt';

const salt = 10;

const hashPassword = async (password: string): Promise<string> => {
  return await bcrypt.hash(password, salt);
};

const comparePassword = async (
  password: string,
  hashedPassword: string,
): Promise<boolean> => {
  return await bcrypt.compare(password, hashedPassword);
};

export { hashPassword, comparePassword };
