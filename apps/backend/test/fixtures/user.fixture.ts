import { generateUniqueEmail } from '../helpers/unique';

/**
 * User fixtures for authentication tests
 */
export const userFixtures = {
  /**
   * Default test user with unique email
   */
  default: () => ({
    email: generateUniqueEmail(),
    password: 'Test1234!',
  }),

  /**
   * User with custom email
   */
  withEmail: (email: string) => ({
    email,
    password: 'Test1234!',
  }),

  /**
   * User with weak password (for validation testing)
   */
  weakPassword: () => ({
    email: generateUniqueEmail(),
    password: 'weak',
  }),

  /**
   * User with missing fields (for validation testing)
   */
  incomplete: () => ({
    email: generateUniqueEmail(),
    // password missing
  }),
};
