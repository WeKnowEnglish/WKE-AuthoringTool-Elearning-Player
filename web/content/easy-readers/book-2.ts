import type { EasyReaderBook } from "@/content/easy-readers/book-1";

export const bookTwo: EasyReaderBook = {
  id: "where-is-milo",
  series: "WeKnow English Easy Readers",
  title: "Where Is Milo?",
  level: "A1",
  bookNumber: 2,
  cover: "/easy-readers/book-2/cover.png",
  description:
    "Milo is not in his basket. Mia and Leo follow the clues from their house to the park.",
  learningGoals: [
    "Describe where people, animals, and things are",
    "Use room, neighborhood, and animal words",
    "Understand there is, there are, and common prepositions",
  ],
  chapters: [
    {
      id: "an-empty-basket",
      number: 1,
      title: "An Empty Basket",
      focus: "Mia and Leo discover that Milo is missing.",
      illustration: "/easy-readers/book-2/chapter-1-an-empty-basket.png",
      illustrationAlt:
        "Mia and Leo look at Milo’s empty basket in the kitchen while the back door stands open.",
      paragraphs: [
        "It is Saturday morning. Mia puts two bowls on the kitchen table. Leo pours some milk. Their small dog, Milo, always sits beside Leo at breakfast, but today his place is empty.",
        "“Milo! Breakfast!” calls Mia. There is no happy bark. There are no little feet on the floor. Mia looks beside the table and behind the door. Milo is not there.",
        "Leo sees Milo’s empty basket near the window. His blue ball is in the basket, but his blue collar is gone. The back door is open. “Oh no,” says Leo. “Where is Milo?”",
      ],
      vocabulary: [
        {
          word: "empty",
          meaning: "with nothing or nobody inside",
          example: "Milo’s basket is empty.",
        },
        {
          word: "beside",
          meaning: "next to someone or something",
          example: "Milo usually sits beside Leo.",
        },
        {
          word: "collar",
          meaning: "a band an animal wears around its neck",
          example: "Milo wears a blue collar.",
        },
      ],
      check: {
        question: "What is in Milo’s basket?",
        choices: ["His blue ball", "His breakfast", "His collar"],
        answerIndex: 0,
        success: "Correct! Milo’s blue ball is in the basket.",
        retry: "Read the last paragraph and look inside the basket.",
      },
      talkPrompt: "Where does your pet or favorite toy sleep?",
    },
    {
      id: "searching-the-house",
      number: 2,
      title: "Searching the House",
      focus: "The children look in every room.",
      illustration: "/easy-readers/book-2/chapter-2-searching-the-house.png",
      illustrationAlt:
        "Mia looks under a living-room sofa while Leo checks behind a bedroom curtain for Milo.",
      paragraphs: [
        "Mia and Leo search the house. In the living room, Mia looks under the sofa and behind the curtains. There are two shoes under the sofa, but there is no dog.",
        "Leo runs upstairs. He looks in the bathroom. Milo is not in the shower or behind the door. In Mia’s room, there is a brown shape on the bed. Leo pulls back the blanket. It is only a teddy bear.",
        "The children meet in the hall. “He is not upstairs, and he is not downstairs,” says Mia. Then Leo finds three small, muddy paw prints next to the back door. The prints go outside.",
      ],
      vocabulary: [
        {
          word: "curtain",
          meaning: "cloth that covers a window",
          example: "Mia looks behind the curtain.",
        },
        {
          word: "upstairs",
          meaning: "on a higher floor of a building",
          example: "Leo searches upstairs.",
        },
        {
          word: "paw print",
          meaning: "a mark made by an animal’s foot",
          example: "There is a muddy paw print by the door.",
        },
      ],
      check: {
        question: "What is the brown shape on Mia’s bed?",
        choices: ["Milo", "A teddy bear", "A jacket"],
        answerIndex: 1,
        success: "Yes! The brown shape is Mia’s teddy bear.",
        retry: "Look again at what Leo finds under the blanket.",
      },
      talkPrompt: "Name three rooms in your home. What is in each room?",
    },
    {
      id: "clues-in-the-garden",
      number: 3,
      title: "Clues in the Garden",
      focus: "Paw prints lead to a gap under the fence.",
      illustration: "/easy-readers/book-2/chapter-3-clues-in-the-garden.png",
      illustrationAlt:
        "Mia and Leo follow muddy paw prints across their garden to a small gap under the fence.",
      paragraphs: [
        "Outside, the garden is wet after the night rain. There are paw prints between the flowerpots. Mia and Leo follow them across the grass. The prints stop near the white fence.",
        "There is a small gap under the fence. Next to the gap, Leo finds Milo’s yellow toy duck. “Milo went under here,” he says. Mia looks through the gap, but there is only an empty path on the other side.",
        "Mia gets Milo’s red lead and a picture of him. Leo closes the back door. “We need to look in the neighborhood,” says Mia. “Let’s ask people if they can see him.”",
      ],
      vocabulary: [
        {
          word: "wet",
          meaning: "covered with water",
          example: "The garden is wet after the rain.",
        },
        {
          word: "gap",
          meaning: "a small open space between or under things",
          example: "There is a gap under the fence.",
        },
        {
          word: "lead",
          meaning: "a long strap used when walking a dog",
          example: "Mia takes Milo’s red lead.",
        },
      ],
      check: {
        question: "What is next to the gap under the fence?",
        choices: ["A yellow toy duck", "A blue bowl", "A red shoe"],
        answerIndex: 0,
        success: "Great clue-finding! Milo’s yellow toy duck is by the gap.",
        retry: "Read the middle paragraph and find the toy.",
      },
      talkPrompt: "What can you see in a garden? Use there is or there are.",
    },
    {
      id: "around-the-neighborhood",
      number: 4,
      title: "Around the Neighborhood",
      focus: "Mia and Leo ask people near familiar places.",
      illustration: "/easy-readers/book-2/chapter-4-around-the-neighborhood.png",
      illustrationAlt:
        "Mia shows Milo’s picture to a baker while Leo looks toward the bus stop and park.",
      paragraphs: [
        "First, Mia and Leo go to the bakery. There are warm loaves in the window. Mia shows Milo’s picture to Mr Chen. “Is there a small brown-and-white dog near your shop?” she asks. Mr Chen shakes his head.",
        "Next, they look at the bus stop. There are four people on the bench, but Milo is not under it or behind it. A woman says, “I saw a little dog near the park ten minutes ago.”",
        "The children hurry past the library and across the road. At the park gate, there is a muddy paw print on the ground. There is also a small piece of blue cloth. It is the same blue as Milo’s collar.",
      ],
      vocabulary: [
        {
          word: "bakery",
          meaning: "a shop that makes and sells bread and cakes",
          example: "There are warm loaves in the bakery.",
        },
        {
          word: "bus stop",
          meaning: "a place where people wait for a bus",
          example: "Four people are at the bus stop.",
        },
        {
          word: "neighborhood",
          meaning: "the streets and places near your home",
          example: "Mia and Leo search their neighborhood.",
        },
      ],
      check: {
        question: "Where did the woman see a little dog?",
        choices: ["Near the park", "Inside the bakery", "At the library"],
        answerIndex: 0,
        success: "Correct! The woman saw a little dog near the park.",
        retry: "Read what the woman at the bus stop says.",
      },
      talkPrompt: "What places are there near your home?",
    },
    {
      id: "a-bark-by-the-shed",
      number: 5,
      title: "A Bark by the Shed",
      focus: "A quiet sound leads the children to the park shed.",
      illustration: "/easy-readers/book-2/chapter-5-a-bark-by-the-shed.png",
      illustrationAlt:
        "Mia and Leo listen beside a small wooden shed in the park as a dog paw appears under the door.",
      paragraphs: [
        "The park is big. There are trees around the playground and ducks on the pond. Mia calls, “Milo!” Leo looks behind the benches and between the trees. There is no dog.",
        "Then they hear a quiet sound. Scratch, scratch. Woof! It comes from a small wooden shed behind the pond. The shed door is closed. Under the door, Mia can see one little brown paw.",
        "“Milo is in there!” cries Leo. A park worker brings a key and opens the door. Milo runs out and jumps into Mia’s arms. Behind him, there is a tiny gray kitten in a box.",
      ],
      vocabulary: [
        {
          word: "pond",
          meaning: "a small area of water",
          example: "There are ducks on the pond.",
        },
        {
          word: "shed",
          meaning: "a small building used to keep tools and other things",
          example: "Milo is inside the wooden shed.",
        },
        {
          word: "scratch",
          meaning: "to move nails or claws across a surface",
          example: "The children hear Milo scratch the door.",
        },
      ],
      check: {
        question: "What can Mia see under the shed door?",
        choices: ["A brown paw", "A yellow duck", "A blue ball"],
        answerIndex: 0,
        success: "Yes! Mia sees Milo’s little brown paw.",
        retry: "Look at the end of the second paragraph.",
      },
      talkPrompt: "What animals can you see in a park?",
    },
    {
      id: "two-animals-go-home",
      number: 6,
      title: "Two Animals Go Home",
      focus: "Milo and the kitten are both safely reunited with their families.",
      illustration: "/easy-readers/book-2/chapter-6-two-animals-go-home.png",
      illustrationAlt:
        "Mia and Leo hug Milo beside the open park shed while a happy family holds the rescued gray kitten.",
      paragraphs: [
        "Milo’s blue collar is loose, but he is safe. The park worker says the wind closed the shed door. Milo probably followed the kitten inside and could not get out.",
        "There is a phone number on the kitten’s red tag. Soon, a family arrives. Their little girl hugs the kitten. “Thank you for finding Pepper,” she says. Mia smiles at Milo. “And thank you for staying with her.”",
        "At home, Leo fixes the gap under the fence with his father. Mia puts Milo’s collar on the table and gives him dinner. Milo sleeps in his basket between his blue ball and yellow duck. Now everyone knows exactly where he is.",
      ],
      vocabulary: [
        {
          word: "safe",
          meaning: "not in danger",
          example: "Milo and Pepper are safe.",
        },
        {
          word: "tag",
          meaning: "a small label with information on it",
          example: "There is a phone number on Pepper’s tag.",
        },
        {
          word: "fix",
          meaning: "to repair something so it works again",
          example: "Leo and his father fix the fence.",
        },
      ],
      check: {
        question: "Where does Milo sleep at the end?",
        choices: ["In his basket", "Under the park bench", "Inside the shed"],
        answerIndex: 0,
        success: "Wonderful! Milo is home and sleeps in his basket.",
        retry: "Read the final sentence group and find Milo’s sleeping place.",
      },
      talkPrompt: "How can people help when an animal is lost?",
    },
  ],
};
