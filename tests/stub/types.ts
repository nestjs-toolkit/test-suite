import { UserPerson } from '../../lib';

export interface FakeUser extends UserPerson {
  id: string;
  email: string;
  roles: string[];
}
