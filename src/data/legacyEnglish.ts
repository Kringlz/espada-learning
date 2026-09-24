import { Topic, Area, Question } from "../core/types";
const q = (
  id: string,
  prompt: string,
  correct: number | string,
  wrong: (number | string)[],
  explanation: string,
  hint: string,
): Question => {
  const options = [String(correct), ...wrong.map(String)];
  const shift = id.charCodeAt(id.length - 1) % 4;
  return {
    id,
    prompt,
    choices: [...options.slice(shift), ...options.slice(0, shift)],
    answer: (4 - shift) % 4,
    explanation,
    hint,
  };
};
type Spec = [
  string,
  string,
  Area,
  string[],
  string,
  string,
  string,
  (n: number, id: string) => Question,
];
const specs: Spec[] = [
  [
    "place-value",
    "Make sense of place value",
    "number",
    [],
    "Read and build whole numbers using place value.",
    "Every digit has a place. From right to left, the places are ones, tens, hundreds and thousands. Moving one place to the left makes a digit’s value ten times larger.",
    "In 3,742, the 7 means 7 hundreds, or 700. The whole number is 3,000 + 700 + 40 + 2.",
    (n, id) =>
      q(
        id,
        `What is the value of the ${n + 2} in ${n + 2},481?`,
        (n + 2) * 1000,
        [(n + 2) * 100, (n + 2) * 10, n + 2],
        `The digit is in the thousands place: ${n + 2} × 1,000 = ${(n + 2) * 1000}.`,
        "Count places from the right: ones, tens, hundreds, thousands.",
      ),
  ],
  [
    "operations",
    "Confident with operations",
    "number",
    ["place-value"],
    "Use multiplication before addition in a calculation.",
    "Order of operations helps everyone read a calculation in the same way. First calculate inside brackets. Then multiply or divide. Finally add or subtract.",
    "For 5 + 3 × 4, multiply first: 3 × 4 = 12. Then 5 + 12 = 17.",
    (n, id) =>
      q(
        id,
        `${n + 3} + 4 × 3 = ?`,
        n + 15,
        [(n + 7) * 3, n + 10, n + 12],
        `4 × 3 = 12. Then ${n + 3} + 12 = ${n + 15}.`,
        "Do the multiplication before the addition.",
      ),
  ],
  [
    "equivalent",
    "Equivalent fractions",
    "fractions",
    ["operations"],
    "Find fractions that name the same amount.",
    "A fraction describes equal parts of a whole. Multiply or divide the top and bottom by the same non-zero number to keep the amount unchanged.",
    "1/2 = 2/4 = 3/6. Imagine the same half of a loaf cut into more, smaller pieces. The number of pieces changes, but the amount of bread does not.",
    (n, id) =>
      q(
        id,
        `Which fraction is equivalent to 1/2 with denominator ${(n + 2) * 2}?`,
        `${n + 2}/${(n + 2) * 2}`,
        [
          `1/${(n + 2) * 2}`,
          `${n + 3}/${(n + 2) * 2}`,
          `${(n + 2) * 2}/${n + 2}`,
        ],
        `Multiply both 1 and 2 by ${n + 2}: 1/2 = ${n + 2}/${(n + 2) * 2}.`,
        "What did you multiply the denominator by? Do the same to the numerator.",
      ),
  ],
  [
    "add-fractions",
    "Add unlike fractions",
    "fractions",
    ["equivalent"],
    "Add fractions by finding a common denominator.",
    "You can only count fractional pieces together when they have the same size. Rename fractions using a common denominator, add the numerators, and keep the denominator.",
    "1/2 + 1/4 = 2/4 + 1/4 = 3/4. The denominator stays 4 because the pieces are still quarters.",
    (n, id) =>
      q(
        id,
        `1/2 + 1/${2 * (n + 2)} = ? (Choose the equivalent sum.)`,
        `${n + 3}/${2 * (n + 2)}`,
        [`2/${2 * (n + 2) + 2}`, `${n + 2}/${2 * (n + 2)}`, `1/${2 * (n + 2)}`],
        `1/2 = ${n + 2}/${2 * (n + 2)}. Add 1 to the numerator to get ${n + 3}/${2 * (n + 2)}.`,
        "Rename one half so both denominators match.",
      ),
  ],
  [
    "ratios",
    "Ratios in everyday life",
    "fractions",
    ["equivalent"],
    "Scale a ratio while keeping its relationship.",
    "A ratio compares amounts. If a drink uses 1 part juice to 3 parts water, each batch uses four parts in total. Scale both quantities by the same number.",
    "For 2 cups of juice at a 1 : 3 ratio, use 6 cups of water. The ratio stays 2 : 6 = 1 : 3.",
    (n, id) =>
      q(
        id,
        `A drink uses juice : water = 1 : 3. For ${n + 2} cups of juice, how many cups of water?`,
        (n + 2) * 3,
        [n + 5, n + 2, (n + 2) * 4],
        `Multiply both parts by ${n + 2}: use ${(n + 2) * 3} cups of water.`,
        "There are 3 cups of water for every cup of juice.",
      ),
  ],
  [
    "patterns",
    "Find the pattern",
    "algebra",
    ["operations"],
    "Describe and continue a sequence with a constant step.",
    "Look at the difference between neighbouring terms. If the difference is the same each time, use that step to continue the sequence.",
    "4, 7, 10, 13 increases by 3 each time. The next term is 16.",
    (n, id) =>
      q(
        id,
        `Continue: ${n + 1}, ${n + 5}, ${n + 9}, …`,
        n + 13,
        [n + 12, n + 14, n + 18],
        `The step is +4 each time. ${n + 9} + 4 = ${n + 13}.`,
        "Subtract the first term from the second.",
      ),
  ],
  [
    "equations",
    "Keep equations balanced",
    "algebra",
    ["patterns"],
    "Solve a one-step equation using the inverse operation.",
    "An equation is a balance. Do the same operation to both sides to keep it equal. Undo addition with subtraction, and multiplication with division.",
    "x + 6 = 14. Subtract 6 from both sides: x = 8. Check: 8 + 6 = 14.",
    (n, id) =>
      q(
        id,
        `Solve x + ${n + 3} = ${2 * n + 10}.`,
        n + 7,
        [3 * n + 13, n + 6, n + 8],
        `Subtract ${n + 3} from both sides: x = ${2 * n + 10} − ${n + 3} = ${n + 7}.`,
        "Undo the addition by subtracting the same amount on each side.",
      ),
  ],
  [
    "perimeter",
    "Around the edge",
    "geometry",
    ["operations"],
    "Find the perimeter of a rectangle.",
    "Perimeter is the distance around the outside of a shape. A rectangle has two equal lengths and two equal widths. Add all four sides.",
    "A 6 cm by 4 cm rectangle has perimeter 6 + 4 + 6 + 4 = 20 cm.",
    (n, id) =>
      q(
        id,
        `A rectangle is ${n + 4} cm long and 3 cm wide. What is its perimeter?`,
        `${2 * (n + 7)} cm`,
        [`${2 * (n + 7) + 2} cm`, `${n + 7} cm`, `${2 * (n + 7) - 2} cm`],
        `Add all sides: ${n + 4} + 3 + ${n + 4} + 3 = ${2 * (n + 7)} cm.`,
        "Count both lengths and both widths.",
      ),
  ],
  [
    "area",
    "Covering a surface",
    "geometry",
    ["perimeter"],
    "Calculate rectangle area in square units.",
    "Area measures how much flat space a shape covers. A rectangle can be filled with rows of unit squares. Multiply its length by its width.",
    "A 5 cm by 3 cm rectangle has 3 rows of 5 squares: 15 cm². Perimeter and area measure different things.",
    (n, id) =>
      q(
        id,
        `What is the area of a ${n + 4} cm by 3 cm rectangle?`,
        `${3 * (n + 4)} cm²`,
        [`${3 * (n + 4) + 3} cm²`, `${n + 7} cm²`, `${3 * (n + 4) - 3} cm²`],
        `${n + 4} × 3 = ${3 * (n + 4)} square centimetres.`,
        "Area counts squares: multiply length by width.",
      ),
  ],
  [
    "angles",
    "Angles on a straight line",
    "geometry",
    ["operations"],
    "Find a missing angle on a straight line.",
    "Angles measure turns in degrees. A half-turn is 180°. Adjacent angles that together form a straight line must add to 180°.",
    "If one angle on a straight line is 65°, the other is 180° − 65° = 115°.",
    (n, id) =>
      q(
        id,
        `Two angles form a straight line. One is ${40 + n * 10}°. Find the other.`,
        `${140 - n * 10}°`,
        [`${150 - n * 10}°`, `${130 - n * 10}°`, `${320 - n * 10}°`],
        `180° − ${40 + n * 10}° = ${140 - n * 10}°.`,
        "A straight line is a half-turn: 180 degrees.",
      ),
  ],
  [
    "averages",
    "Understanding the mean",
    "data",
    ["operations"],
    "Find the mean of a small data set.",
    "The mean is a fair-share average. Add the values and divide by how many values there are. Include zero values when they are part of the data.",
    "The mean of 2, 4 and 9 is (2 + 4 + 9) ÷ 3 = 5.",
    (n, id) =>
      q(
        id,
        `Find the mean of ${n + 2}, ${n + 4} and ${n + 6}.`,
        n + 4,
        [3 * n + 12, n + 2, n + 6],
        `Their total is ${3 * n + 12}. Divide by 3 values: ${n + 4}.`,
        "Add all three values, then share the total equally among three.",
      ),
  ],
  [
    "probability",
    "How likely is it?",
    "data",
    ["equivalent", "averages"],
    "Express the probability of an equally likely outcome.",
    "Probability compares the number of outcomes you want with all possible equally likely outcomes. An impossible event has probability 0; a certain event has probability 1.",
    "A bag has 3 blue and 2 red counters. For a random pick, P(blue) = 3/5 because 3 of the 5 counters are blue.",
    (n, id) =>
      q(
        id,
        `A bag has ${n + 2} blue and 3 red counters. What is the probability of picking blue?`,
        `${n + 2}/${n + 5}`,
        [`${n + 3}/${n + 5}`, `${n + 2}/${n + 6}`, `1/${n + 5}`],
        `There are ${n + 5} counters in all, and ${n + 2} are blue. Probability = ${n + 2}/${n + 5}.`,
        "Put the number of blue counters over the total number of counters.",
      ),
  ],
];
export const englishCurriculum: Topic[] = specs.map(
  ([id, title, area, prerequisites, objective, lesson, example, make]) => ({
    id,
    title,
    area,
    prerequisites,
    objective,
    lesson,
    example,
    minutes: 8,
    practice: make(0, `${id}-guided`),
    checks: Array.from({ length: 6 }, (_, i) =>
      make(i + 1, `${id}-check-${i + 1}`),
    ),
  }),
);
