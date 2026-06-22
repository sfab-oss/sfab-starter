import type { PersonRow } from "./types";

const FIRST_NAMES = [
  "Maria",
  "Carlos",
  "Ana",
  "Luis",
  "Elena",
  "James",
  "Sarah",
  "Michael",
  "Emily",
  "David",
  "Jessica",
  "Robert",
  "Ashley",
  "Daniel",
  "Amanda",
  "Christopher",
  "Nicole",
  "Matthew",
  "Stephanie",
  "Andrew",
  "Rachel",
  "Joshua",
  "Lauren",
  "Kevin",
  "Megan",
  "Brian",
  "Hannah",
  "Ryan",
] as const;

const LAST_NAMES = [
  "Gonzalez",
  "Ruiz",
  "Martinez",
  "Herrera",
  "Chen",
  "Johnson",
  "Williams",
  "Brown",
  "Davis",
  "Miller",
  "Wilson",
  "Moore",
  "Taylor",
  "Anderson",
  "Thomas",
  "Jackson",
  "White",
  "Harris",
  "Martin",
  "Thompson",
  "Garcia",
  "Martinez",
  "Robinson",
  "Clark",
  "Rodriguez",
  "Lewis",
  "Lee",
  "Walker",
] as const;

const CITIES = [
  "Chicago",
  "Denver",
  "Austin",
  "Seattle",
  "Portland",
  "Boston",
  "Miami",
  "Phoenix",
  "Atlanta",
  "Dallas",
] as const;

export const MOCK_PEOPLE: PersonRow[] = FIRST_NAMES.map((firstName, index) => {
  const lastName = LAST_NAMES[index];
  const role: PersonRow["role"] = index % 4 === 0 ? "Supplier" : "Customer";
  const city = CITIES[index % CITIES.length] ?? CITIES[0];

  return {
    id: String(index + 1),
    name: `${firstName} ${lastName}`,
    role,
    city,
    status: index % 5 === 0 ? "inactive" : "active",
  };
});
