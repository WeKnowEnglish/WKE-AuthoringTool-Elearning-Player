export type EasyReaderVocabulary = {
  word: string;
  meaning: string;
  example: string;
};

export type EasyReaderCheck = {
  question: string;
  choices: string[];
  answerIndex: number;
  success: string;
  retry: string;
};

export type EasyReaderChapter = {
  id: string;
  number: number;
  title: string;
  focus: string;
  illustration: string;
  illustrationAlt: string;
  paragraphs: string[];
  vocabulary: EasyReaderVocabulary[];
  check: EasyReaderCheck;
  talkPrompt: string;
};

export type EasyReaderBook = {
  id: string;
  series: string;
  title: string;
  level: string;
  bookNumber: number;
  cover: string;
  description: string;
  learningGoals: string[];
  chapters: EasyReaderChapter[];
};

export const bookOne: EasyReaderBook = {
  id: "the-new-student",
  series: "WeKnow English Easy Readers",
  title: "The New Student",
  level: "A1",
  bookNumber: 1,
  cover: "/easy-readers/book-1/cover.png",
  description:
    "Sam starts at a new school. Can he learn new names and make new friends?",
  learningGoals: [
    "Introduce yourself with name, age, and country",
    "Ask and answer simple questions about hobbies",
    "Understand useful school and friendship words",
  ],
  chapters: [
    {
      id: "a-new-school",
      number: 1,
      title: "A New School",
      focus: "Sam arrives and feels nervous.",
      illustration: "/easy-readers/book-1/chapter-1-a-new-school.png",
      illustrationAlt:
        "Sam arrives at Green Hill School and Ms Green welcomes him at the gate.",
      paragraphs: [
        "It is Monday morning. Sam stands outside Green Hill School with his blue backpack. The school is big, and the playground is full of children.",
        "Sam is excited, but he is nervous too. He does not know the teachers. He does not have a friend at this school yet.",
        "A teacher walks to him. She has a kind smile. “Hello! I’m Ms Green,” she says. “You are Sam, right? Welcome to our school.” Sam smiles. “Yes, I’m Sam. Thank you.”",
      ],
      vocabulary: [
        {
          word: "nervous",
          meaning: "worried or a little afraid about something new",
          example: "Sam is nervous at his new school.",
        },
        {
          word: "playground",
          meaning: "a place outside where children play",
          example: "The children are in the playground.",
        },
        {
          word: "welcome",
          meaning: "a friendly word for someone who has arrived",
          example: "Welcome to our school!",
        },
      ],
      check: {
        question: "How does Sam feel outside the school?",
        choices: ["Only angry", "Excited and nervous", "Tired and hungry"],
        answerIndex: 1,
        success: "Yes! A new school is exciting, but Sam feels nervous too.",
        retry: "Look at the second paragraph and try again.",
      },
      talkPrompt: "How do you feel when you go to a new place?",
    },
    {
      id: "hello-im-sam",
      number: 2,
      title: "Hello, I’m Sam",
      focus: "Sam tells the class about himself.",
      illustration: "/easy-readers/book-1/chapter-2-hello-sam.png",
      illustrationAlt:
        "Sam stands beside Ms Green and introduces himself to his new class.",
      paragraphs: [
        "Ms Green takes Sam into the classroom. “Class, this is Sam. He is our new student,” she says. Sam stands next to the board.",
        "“Hello. My name is Sam Lee. I am nine years old. I am from Singapore. I have one sister. Her name is May,” Sam says.",
        "A girl smiles at him. “Hi, Sam. I’m Mia. I’m nine too.” A boy waves. “And I’m Leo. I’m ten. Nice to meet you!” Sam looks at the friendly faces. “Nice to meet you too,” he says.",
      ],
      vocabulary: [
        {
          word: "class",
          meaning: "a group of students who learn together",
          example: "Sam says hello to the class.",
        },
        {
          word: "introduce",
          meaning: "to tell people your name or tell them about someone",
          example: "Ms Green introduces Sam.",
        },
        {
          word: "country",
          meaning: "a place such as Vietnam, Singapore, or Japan",
          example: "Singapore is Sam’s country.",
        },
      ],
      check: {
        question: "Where is Sam from?",
        choices: ["Singapore", "Australia", "The United States"],
        answerIndex: 0,
        success: "Correct! Sam says, “I am from Singapore.”",
        retry: "Listen to Sam’s introduction one more time.",
      },
      talkPrompt: "Say your name, age, and country.",
    },
    {
      id: "my-new-class",
      number: 3,
      title: "My New Class",
      focus: "Mia and Leo help Sam in the classroom.",
      illustration: "/easy-readers/book-1/chapter-3-my-new-class.png",
      illustrationAlt:
        "Mia and Leo show Sam his desk and the different places in their classroom.",
      paragraphs: [
        "Mia shows Sam the classroom. “This is the bookcase, and that is our art table,” she says. “Your desk is between my desk and Leo’s desk.”",
        "Sam puts down his backpack. He has a blue pencil case, two pens, and a ruler. He does not have a red pencil. Leo gives him one. “Here you are,” says Leo. “Thanks!” says Sam.",
        "The class reads a short English story. Sam does not know one word. Mia points to the picture and helps him. Now Sam understands. He likes his new class.",
      ],
      vocabulary: [
        {
          word: "bookcase",
          meaning: "a piece of furniture for books",
          example: "The books are in the bookcase.",
        },
        {
          word: "between",
          meaning: "in the middle of two people or things",
          example: "Sam sits between Mia and Leo.",
        },
        {
          word: "understand",
          meaning: "to know what something means",
          example: "The picture helps Sam understand the word.",
        },
      ],
      check: {
        question: "What does Leo give Sam?",
        choices: ["A ruler", "A red pencil", "A storybook"],
        answerIndex: 1,
        success: "That’s right! Leo gives Sam a red pencil.",
        retry: "Check the middle paragraph for the school object.",
      },
      talkPrompt: "What things do you have in your school bag?",
    },
    {
      id: "what-do-you-like",
      number: 4,
      title: "What Do You Like?",
      focus: "The new friends talk about their hobbies.",
      illustration: "/easy-readers/book-1/chapter-4-what-do-you-like.png",
      illustrationAlt:
        "Sam, Mia, and Leo talk about football, drawing, dancing, and books in the playground.",
      paragraphs: [
        "At break time, Sam goes to the playground with Mia and Leo. Leo has a football. Mia has a small book and a drawing pad.",
        "“What do you like to do, Sam?” Mia asks. “I like football, and I love drawing robots,” says Sam. “Do you like drawing?” “Yes, I do,” says Mia. “I like books and dancing too.”",
        "Leo smiles. “I like football. Let’s play!” The three children pass the ball. Sam kicks it into the goal. Mia and Leo cheer. Sam laughs. They like some different things, but they can have fun together.",
      ],
      vocabulary: [
        {
          word: "break time",
          meaning: "a short time between lessons when students can rest or play",
          example: "We play outside at break time.",
        },
        {
          word: "hobby",
          meaning: "an activity you like to do for fun",
          example: "Drawing is Sam’s hobby.",
        },
        {
          word: "cheer",
          meaning: "to shout happily for someone",
          example: "Mia and Leo cheer for Sam.",
        },
      ],
      check: {
        question: "What does Sam love drawing?",
        choices: ["Robots", "Animals", "Cars"],
        answerIndex: 0,
        success: "Great reading! Sam loves drawing robots.",
        retry: "Read Sam’s answer to Mia’s question again.",
      },
      talkPrompt: "What do you like to do after school?",
    },
    {
      id: "lunchtime",
      number: 5,
      title: "Lunchtime",
      focus: "Sam shares lunchtime with his new friends.",
      illustration: "/easy-readers/book-1/chapter-5-lunchtime.png",
      illustrationAlt:
        "Mia and Leo invite Sam to sit with them for lunch at school.",
      paragraphs: [
        "At twelve o’clock, the children go to lunch. The room is busy and loud. Sam has rice, chicken, and an apple on his tray. He looks for a place to sit.",
        "“Sam! Sit with us!” calls Mia. There is an empty chair next to Leo. Sam sits down. Leo has two sandwiches and a banana. Mia has noodles and some orange juice.",
        "“What is your favorite food?” asks Leo. “Noodles,” says Sam. “Me too!” says Mia. They talk about food, families, and school. Sam is not alone now. He has two new friends.",
      ],
      vocabulary: [
        {
          word: "lunchtime",
          meaning: "the time when people eat lunch",
          example: "We eat together at lunchtime.",
        },
        {
          word: "tray",
          meaning: "a flat object used to carry food and drinks",
          example: "Sam carries his lunch on a tray.",
        },
        {
          word: "empty",
          meaning: "with nothing or nobody in it",
          example: "There is an empty chair next to Leo.",
        },
      ],
      check: {
        question: "Who asks Sam to sit with them?",
        choices: ["Ms Green", "Mia", "May"],
        answerIndex: 1,
        success: "Yes! Mia calls Sam and shows him an empty chair.",
        retry: "Look at the first words in the second paragraph.",
      },
      talkPrompt: "What food do you like to eat for lunch?",
    },
    {
      id: "a-good-first-day",
      number: 6,
      title: "A Good First Day",
      focus: "Sam feels welcome and goes home happy.",
      illustration: "/easy-readers/book-1/chapter-6-a-good-first-day.png",
      illustrationAlt:
        "Sam happily waves goodbye to Mia, Leo, and Ms Green after his first school day.",
      paragraphs: [
        "At the end of the day, Ms Green gives Sam a small card. “This is from your class,” she says. The card says, “Welcome, Sam!” It has the children’s names and pictures of their hobbies.",
        "Sam reads Mia’s name next to a book. He sees Leo’s name next to a football. Next to his own name, Sam draws a little robot. Everyone smiles.",
        "Outside the school, Sam’s mother waits for him. “How is your new school?” she asks. “It is great!” says Sam. “I have a kind teacher and two new friends.” Mia and Leo wave from the gate. Sam waves back. He is ready for tomorrow.",
      ],
      vocabulary: [
        {
          word: "card",
          meaning: "a small piece of paper with a message or picture",
          example: "The class gives Sam a welcome card.",
        },
        {
          word: "kind",
          meaning: "friendly and helpful",
          example: "Ms Green is a kind teacher.",
        },
        {
          word: "ready",
          meaning: "prepared to do something",
          example: "Sam is ready for tomorrow.",
        },
      ],
      check: {
        question: "What is on the class card?",
        choices: ["Names and hobby pictures", "A lunch menu", "A school map"],
        answerIndex: 0,
        success: "Excellent! The card has names and pictures of hobbies.",
        retry: "Read the first paragraph and look for the card.",
      },
      talkPrompt: "What can you do to welcome a new student?",
    },
  ],
};
