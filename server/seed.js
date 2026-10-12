require('dotenv').config({ quiet: true });
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const User = require('./models/User');
const ShelterProfile = require('./models/ShelterProfile');
const Animal = require('./models/Animal');
const Application = require('./models/Application');
const Conversation = require('./models/Conversation');
const Message = require('./models/Message');
const Notification = require('./models/Notification');
const CheckIn = require('./models/CheckIn');
const Review = require('./models/Review');
const { matchAnimal } = require('./utils/matching');
const { CHECKIN_SCHEDULE } = require('./utils/constants');

const PASSWORD = 'Test@12345';
const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (n) => new Date(Date.now() - n * DAY);
const point = (lat, lng) => ({ type: 'Point', coordinates: [lng, lat] });

const PLACES = {
  gachibowli: { lat: 17.4401, lng: 78.3489, city: 'Gachibowli, Hyderabad' },
  kondapur: { lat: 17.4699, lng: 78.3578, city: 'Kondapur, Hyderabad' },
  banjaraHills: { lat: 17.4156, lng: 78.4347, city: 'Banjara Hills, Hyderabad' },
  secunderabad: { lat: 17.4399, lng: 78.4983, city: 'Secunderabad' },
  kukatpally: { lat: 17.4948, lng: 78.3996, city: 'Kukatpally, Hyderabad' },
  madhapur: { lat: 17.4483, lng: 78.3915, city: 'Madhapur, Hyderabad' },
};

const UPLOAD_DIR = path.join(__dirname, 'uploads');
const IMAGE_DIR = path.join(__dirname, 'seed-images');

function resetUploads() {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  for (const file of fs.readdirSync(UPLOAD_DIR)) {
    if (file !== '.gitkeep') fs.rmSync(path.join(UPLOAD_DIR, file), { force: true });
  }
}

function photo(name) {
  const file = fs.readdirSync(IMAGE_DIR).find((f) => f.endsWith(`-${name}.jpg`));
  if (!file) return null;
  fs.copyFileSync(path.join(IMAGE_DIR, file), path.join(UPLOAD_DIR, `seed-${file}`));
  return `/uploads/seed-${file}`;
}

async function createUser(data) {
  return User.create({ password: PASSWORD, createdAt: daysAgo(150), ...data });
}

async function createShelter({ name, email, phone, place, organisationName, type, description, address, isVerified, website, joinedDaysAgo = 200 }) {
  const user = await createUser({ name, email, phone, role: 'shelter', city: place.city, location: point(place.lat, place.lng), createdAt: daysAgo(joinedDaysAgo) });
  await ShelterProfile.create({
    user: user._id,
    organisationName,
    type,
    description,
    address,
    city: place.city,
    location: point(place.lat, place.lng),
    contactEmail: email,
    contactPhone: phone,
    website,
    isVerified,
    verifiedAt: isVerified ? daysAgo(60) : undefined,
  });
  return user;
}

function nearby(place, i) {
  const angle = (i * 137.5 * Math.PI) / 180;
  const r = 0.004 + 0.002 * (i % 4);
  return point(place.lat + r * Math.sin(angle), place.lng + r * Math.cos(angle));
}

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log(`Connected to ${mongoose.connection.name}. Clearing old data...`);
  for (const c of await mongoose.connection.db.listCollections().toArray()) await mongoose.connection.db.dropCollection(c.name);
  await Promise.all([User, ShelterProfile, Animal, Application, Conversation, Message, Notification, CheckIn, Review].map((M) => M.syncIndexes()));
  resetUploads();

  const admin = await createUser({ name: 'Admin', email: 'admin@gmail.com', role: 'admin', phone: '9000000001', city: 'Hyderabad' });

  const user = await createUser({
    name: 'Demo User',
    email: 'user@gmail.com',
    phone: '9000000002',
    city: PLACES.gachibowli.city,
    location: point(PLACES.gachibowli.lat, PLACES.gachibowli.lng),
    preferences: {
      species: ['dog', 'cat'],
      sizes: ['small', 'medium'],
      ageRange: { min: 0, max: 8 },
      hasKids: false,
      hasOtherPets: true,
      otherPetTypes: ['cat'],
      homeType: 'apartment',
      hasYard: false,
      activityLevel: 'medium',
      experience: 'some',
      maxDistanceKm: 15,
    },
  });

  const care = await createShelter({
    name: 'Demo Caregiver',
    email: 'care@gmail.com',
    phone: '9000000003',
    place: PLACES.kondapur,
    organisationName: 'Demo Caregiver',
    type: 'individual caregiver',
    description:
      'I am an independent foster caregiver in Kondapur. I rescue injured and abandoned street animals, nurse them back to health at home, and help them find loving families.',
    address: 'Kondapur Main Road, Hyderabad 500084',
    isVerified: true,
  });

  const happyTails = await createShelter({
    name: 'Priya Sharma',
    email: 'happytails@pawshare.org',
    phone: '9000000011',
    place: PLACES.banjaraHills,
    organisationName: 'Happy Tails Rescue',
    type: 'shelter',
    description: 'A registered rescue in Banjara Hills caring for 40+ dogs and cats. All animals are vaccinated and sterilised before adoption.',
    address: 'Road No. 12, Banjara Hills, Hyderabad 500034',
    website: 'https://happytails.example.org',
    isVerified: true,
  });

  const secShelter = await createShelter({
    name: 'Arjun Reddy',
    email: 'secshelter@pawshare.org',
    phone: '9000000012',
    place: PLACES.secunderabad,
    organisationName: 'Secunderabad Animal Shelter',
    type: 'shelter',
    description: 'Community shelter in Secunderabad focused on senior dogs and special-needs animals.',
    address: 'SP Road, Secunderabad 500003',
    isVerified: true,
  });

  const kukatpally = await createShelter({
    name: 'Neha Verma',
    email: 'kukatpallypaws@pawshare.org',
    phone: '9000000013',
    place: PLACES.kukatpally,
    organisationName: 'Kukatpally Paws Collective',
    type: 'shelter',
    description: 'A new volunteer group rescuing puppies and kittens around KPHB. Awaiting verification.',
    address: 'KPHB Colony, Kukatpally, Hyderabad 500072',
    isVerified: false,
    joinedDaysAgo: 5,
  });

  const asha = await createUser({
    name: 'Asha Rao',
    email: 'asha@pawshare.org',
    phone: '9000000021',
    city: PLACES.madhapur.city,
    location: point(PLACES.madhapur.lat, PLACES.madhapur.lng),
    preferences: { species: ['dog'], sizes: ['medium', 'large'], hasKids: true, homeType: 'house', hasYard: true, activityLevel: 'high', experience: 'experienced', maxDistanceKm: 30 },
  });
  const ravi = await createUser({
    name: 'Ravi Kumar',
    email: 'ravi@pawshare.org',
    phone: '9000000022',
    city: PLACES.secunderabad.city,
    location: point(PLACES.secunderabad.lat + 0.01, PLACES.secunderabad.lng - 0.01),
    preferences: { species: ['cat'], sizes: ['small'], homeType: 'apartment', activityLevel: 'low', experience: 'some', maxDistanceKm: 20 },
  });
  const meera = await createUser({
    name: 'Meera Iyer',
    email: 'meera@pawshare.org',
    phone: '9000000023',
    city: PLACES.kondapur.city,
    location: point(PLACES.kondapur.lat - 0.01, PLACES.kondapur.lng + 0.005),
    preferences: { species: ['rabbit', 'cat'], hasKids: true, homeType: 'house', hasYard: true, activityLevel: 'medium', maxDistanceKm: 10 },
  });

  const vax = (...names) => names.map((name, i) => ({ name, date: daysAgo(40 + i * 20) }));

  const animalSpecs = [
    { key: 'pepper', owner: care, place: PLACES.kondapur, name: 'Pepper', species: 'dog', breed: 'Indie', ageMonths: 14, size: 'small', gender: 'female', color: 'Black and tan', activityLevel: 'medium', temperamentTags: ['friendly', 'good-with-cats', 'house-trained', 'playful'], listingType: 'adoption', status: 'available', photos: ['06'], description: 'Pepper was found as a tiny pup near Kondapur market. She is gentle, already lives with a foster cat and loves short walks followed by long naps.', healthRecords: { vaccinated: true, vaccinations: vax('Rabies', 'DHPPi'), sterilised: true, dewormed: true } },
    { key: 'coco', owner: care, place: PLACES.kondapur, name: 'Coco', species: 'cat', breed: 'Indian Domestic Shorthair', ageMonths: 10, size: 'small', gender: 'female', color: 'Tabby', activityLevel: 'medium', temperamentTags: ['friendly', 'calm', 'good-with-cats', 'house-trained'], listingType: 'both', status: 'available', photos: ['21', '22'], description: 'Coco is a confident young tabby who enjoys window-watching and gentle chin scratches.', healthRecords: { vaccinated: true, vaccinations: vax('FVRCP'), sterilised: true, dewormed: true } },
    { key: 'snowball', owner: care, place: PLACES.kondapur, name: 'Snowball', species: 'rabbit', breed: 'New Zealand White', ageMonths: 8, size: 'small', gender: 'male', color: 'White', activityLevel: 'low', temperamentTags: ['calm', 'shy'], listingType: 'foster', status: 'available', photos: ['28'], description: 'Snowball needs a quiet foster home while he recovers from a minor leg injury. He loves fresh coriander.', healthRecords: { vaccinated: false, dewormed: true, medicalNotes: 'Healing hind-leg sprain. Needs rest and limited jumping for 3 weeks.', specialNeeds: 'Short-term rest' } },
    { key: 'kiwi', owner: care, place: PLACES.kondapur, name: 'Kiwi', species: 'bird', breed: 'Rose-ringed Parakeet', ageMonths: 24, size: 'small', gender: 'male', color: 'Green', activityLevel: 'medium', temperamentTags: ['friendly', 'playful'], listingType: 'both', status: 'available', photos: ['30'], description: 'Kiwi was rescued from an illegal trader. He whistles and says a few words.', healthRecords: { vaccinated: false, medicalNotes: 'Healthy, clipped wings growing back.' } },
    { key: 'biscuit', owner: care, place: PLACES.kondapur, name: 'Biscuit', species: 'dog', breed: 'Indie', ageMonths: 30, size: 'medium', gender: 'male', color: 'Fawn', activityLevel: 'high', temperamentTags: ['energetic', 'friendly', 'kid-friendly', 'good-with-dogs'], listingType: 'adoption', status: 'pending', photos: ['05'], description: 'Biscuit is a happy, bouncy boy who would love a family with a garden.', healthRecords: { vaccinated: true, vaccinations: vax('Rabies', 'DHPPi'), sterilised: true, dewormed: true } },
    { key: 'luna', owner: care, place: PLACES.kondapur, name: 'Luna', species: 'cat', breed: 'Persian mix', ageMonths: 18, size: 'small', gender: 'female', color: 'Ginger', activityLevel: 'low', temperamentTags: ['calm', 'good-with-cats', 'house-trained'], listingType: 'adoption', status: 'adopted', photos: ['19'], description: 'Luna is a gentle ginger lap cat.', healthRecords: { vaccinated: true, vaccinations: vax('FVRCP', 'Rabies'), sterilised: true, dewormed: true } },
    { key: 'mittens', owner: care, place: PLACES.kondapur, name: 'Mittens', species: 'cat', breed: 'Indian Domestic Shorthair', ageMonths: 4, size: 'small', gender: 'male', color: 'Black and white', activityLevel: 'high', temperamentTags: ['playful', 'friendly'], listingType: 'foster', status: 'fostered', photos: ['18'], description: 'Mittens is a playful kitten in a foster home until he is old enough for adoption.', healthRecords: { vaccinated: true, vaccinations: vax('FVRCP'), dewormed: true } },
    { key: 'tiger', owner: care, place: PLACES.kondapur, name: 'Tiger', species: 'cat', breed: 'Maine Coon mix', ageMonths: 36, size: 'medium', gender: 'male', color: 'White', activityLevel: 'low', temperamentTags: ['calm', 'shy', 'needs-experienced-owner'], listingType: 'adoption', status: 'available', photos: ['27'], description: 'Tiger is a shy gentle giant who needs a calm adult home and some patience.', healthRecords: { vaccinated: true, vaccinations: vax('FVRCP'), sterilised: true, medicalNotes: 'Mild dental tartar, cleaned in June.' } },

    { key: 'bella', owner: happyTails, place: PLACES.banjaraHills, name: 'Bella', species: 'dog', breed: 'Beagle', ageMonths: 24, size: 'medium', gender: 'female', color: 'Tricolour', activityLevel: 'medium', temperamentTags: ['friendly', 'kid-friendly', 'good-with-dogs', 'good-with-cats'], listingType: 'adoption', status: 'available', photos: ['01'], description: 'Bella has the happiest face in Banjara Hills. She is great with everyone, including cats.', healthRecords: { vaccinated: true, vaccinations: vax('Rabies', 'DHPPi'), sterilised: true, dewormed: true } },
    { key: 'bruno', owner: happyTails, place: PLACES.banjaraHills, name: 'Bruno', species: 'dog', breed: 'Golden Retriever mix', ageMonths: 48, size: 'large', gender: 'male', color: 'Golden', activityLevel: 'high', temperamentTags: ['friendly', 'kid-friendly', 'energetic', 'good-with-dogs'], listingType: 'adoption', status: 'available', photos: ['13', '09'], description: 'Bruno loves fetch, swimming and kids. He needs a home with space to run.', healthRecords: { vaccinated: true, vaccinations: vax('Rabies', 'DHPPi'), sterilised: true, dewormed: true } },
    { key: 'oreo', owner: happyTails, place: PLACES.banjaraHills, name: 'Oreo', species: 'dog', breed: 'Pug', ageMonths: 60, size: 'small', gender: 'male', color: 'Black', activityLevel: 'low', temperamentTags: ['calm', 'friendly', 'house-trained', 'good-with-cats'], listingType: 'both', status: 'available', photos: ['02'], description: 'Oreo is a couch-loving senior pug who snores softly and adores belly rubs.', healthRecords: { vaccinated: true, vaccinations: vax('Rabies'), sterilised: true, medicalNotes: 'Needs a cool room in summer; brachycephalic breed.' } },
    { key: 'daisy', owner: happyTails, place: PLACES.banjaraHills, name: 'Daisy', species: 'dog', breed: 'Cocker Spaniel mix', ageMonths: 20, size: 'medium', gender: 'female', color: 'Golden', activityLevel: 'medium', temperamentTags: ['playful', 'friendly', 'kid-friendly'], listingType: 'adoption', status: 'adopted', photos: ['11'], description: 'Daisy found her family this summer!', healthRecords: { vaccinated: true, sterilised: true } },
    { key: 'whiskers', owner: happyTails, place: PLACES.banjaraHills, name: 'Whiskers', species: 'cat', breed: 'Bengal mix', ageMonths: 30, size: 'small', gender: 'male', color: 'Orange tabby', activityLevel: 'high', temperamentTags: ['playful', 'energetic'], listingType: 'adoption', status: 'available', photos: ['20'], description: 'Whiskers is a curious climber who needs plenty of toys.', healthRecords: { vaccinated: true, vaccinations: vax('FVRCP'), sterilised: true } },
    { key: 'shadow', owner: happyTails, place: PLACES.banjaraHills, name: 'Shadow', species: 'cat', breed: 'British Shorthair mix', ageMonths: 48, size: 'medium', gender: 'male', color: 'Grey', activityLevel: 'low', temperamentTags: ['calm', 'house-trained'], listingType: 'adoption', status: 'available', photos: ['23'], description: 'Shadow is a laid-back grey gentleman who loves sunny windowsills.', healthRecords: { vaccinated: true, sterilised: true } },

    { key: 'max', owner: secShelter, place: PLACES.secunderabad, name: 'Max', species: 'dog', breed: 'Labrador mix', ageMonths: 84, size: 'large', gender: 'male', color: 'Chocolate', activityLevel: 'medium', temperamentTags: ['friendly', 'calm', 'good-with-dogs'], listingType: 'adoption', status: 'available', photos: ['08'], description: 'Max is a senior Lab who still loves his morning walks.', healthRecords: { vaccinated: true, vaccinations: vax('Rabies', 'DHPPi'), sterilised: true, medicalNotes: 'Mild arthritis, on joint supplements.', specialNeeds: 'Senior dog, soft bedding' } },
    { key: 'rocky', owner: secShelter, place: PLACES.secunderabad, name: 'Rocky', species: 'dog', breed: 'Jack Russell Terrier', ageMonths: 36, size: 'small', gender: 'male', color: 'White and tan', activityLevel: 'high', temperamentTags: ['energetic', 'playful', 'needs-experienced-owner'], listingType: 'adoption', status: 'available', photos: ['06'], description: 'Rocky is clever and full of beans. Best with an experienced owner.', healthRecords: { vaccinated: true, sterilised: true } },
    { key: 'ginger', owner: secShelter, place: PLACES.secunderabad, name: 'Ginger', species: 'dog', breed: 'Nova Scotia Retriever mix', ageMonths: 26, size: 'medium', gender: 'female', color: 'Red', activityLevel: 'high', temperamentTags: ['energetic', 'friendly', 'kid-friendly'], listingType: 'both', status: 'available', photos: ['07', '16'], description: 'Ginger lives for the beach and the ball.', healthRecords: { vaccinated: true, sterilised: true, dewormed: true } },
    { key: 'cloud', owner: secShelter, place: PLACES.secunderabad, name: 'Cloud', species: 'dog', breed: 'Samoyed mix', ageMonths: 54, size: 'large', gender: 'female', color: 'White', activityLevel: 'medium', temperamentTags: ['friendly', 'kid-friendly', 'good-with-dogs'], listingType: 'adoption', status: 'adopted', photos: ['15'], description: 'Cloud went home with a lovely family.', healthRecords: { vaccinated: true, sterilised: true } },
    { key: 'sunny', owner: secShelter, place: PLACES.secunderabad, name: 'Sunny', species: 'dog', breed: 'Corgi mix', ageMonths: 5, size: 'small', gender: 'male', color: 'Red and white', activityLevel: 'high', temperamentTags: ['playful', 'friendly', 'kid-friendly'], listingType: 'foster', status: 'available', photos: ['12'], description: 'Sunny is a corgi-mix puppy who needs a foster home for two months.', healthRecords: { vaccinated: true, vaccinations: vax('DHPPi'), dewormed: true } },

    { key: 'milo', owner: kukatpally, place: PLACES.kukatpally, name: 'Milo', species: 'dog', breed: 'Indie', ageMonths: 6, size: 'medium', gender: 'male', color: 'Black and white', activityLevel: 'high', temperamentTags: ['playful', 'friendly'], listingType: 'adoption', status: 'available', photos: ['10'], description: 'Milo is a cheeky pup found near the KPHB metro.', healthRecords: { vaccinated: true, dewormed: true } },
    { key: 'leo', owner: kukatpally, place: PLACES.kukatpally, name: 'Leo', species: 'dog', breed: 'Chow Chow mix', ageMonths: 40, size: 'large', gender: 'male', color: 'Cream', activityLevel: 'low', temperamentTags: ['calm', 'shy'], listingType: 'adoption', status: 'available', photos: ['17'], description: 'Leo is a fluffy, dignified boy who warms up slowly.', healthRecords: { vaccinated: true, sterilised: true } },
    { key: 'nala', owner: kukatpally, place: PLACES.kukatpally, name: 'Nala', species: 'cat', breed: 'Scottish Fold mix', ageMonths: 12, size: 'small', gender: 'female', color: 'Grey tabby', activityLevel: 'low', temperamentTags: ['shy', 'calm'], listingType: 'both', status: 'available', photos: ['26'], description: 'Nala loves hiding under blankets and purring.', healthRecords: { vaccinated: true, sterilised: false } },
    { key: 'pumpkin', owner: kukatpally, place: PLACES.kukatpally, name: 'Pumpkin', species: 'cat', breed: 'Indian Domestic Shorthair', ageMonths: 3, size: 'small', gender: 'female', color: 'Brown tabby', activityLevel: 'high', temperamentTags: ['playful', 'friendly', 'good-with-cats'], listingType: 'foster', status: 'available', photos: ['25'], description: 'Pumpkin is one of a litter of four kittens looking for foster homes.', healthRecords: { vaccinated: false, dewormed: true } },
    { key: 'hazel', owner: kukatpally, place: PLACES.kukatpally, name: 'Hazel', species: 'rabbit', breed: 'Holland Lop', ageMonths: 16, size: 'small', gender: 'female', color: 'Brown and white', activityLevel: 'medium', temperamentTags: ['friendly', 'kid-friendly'], listingType: 'adoption', status: 'available', photos: ['29'], description: 'Hazel is a sweet lop-eared bunny who enjoys being petted.', healthRecords: { vaccinated: false, sterilised: true } },
    { key: 'ghost', owner: happyTails, place: PLACES.banjaraHills, name: 'Ghost', species: 'cat', breed: 'Turkish Angora mix', ageMonths: 30, size: 'small', gender: 'female', color: 'White', activityLevel: 'low', temperamentTags: ['calm'], listingType: 'adoption', status: 'available', photos: ['24'], description: 'Listing removed by the shelter.', healthRecords: { vaccinated: true }, isActive: false },
  ];

  const animals = {};
  for (const [i, spec] of animalSpecs.entries()) {
    const { key, owner, place, photos, ...data } = spec;
    animals[key] = await Animal.create({
      ...data,
      shelter: owner._id,
      city: place.city,
      location: nearby(place, i),
      photos: photos.map(photo).filter(Boolean),
      createdAt: daysAgo(80 - i * 2),
    });
  }

  const questionnaire = (overrides = {}) => ({
    homeType: 'apartment',
    hasYard: false,
    hasKids: false,
    otherPets: 'None',
    experience: 'some',
    workHoursPerDay: 7,
    reason: 'We have wanted to give a rescue a home for a long time and finally have the space and time.',
    ...overrides,
  });

  async function application({ adopter, animalKey, type = 'adoption', steps, q = {}, fosterDuration, startDaysAgo = 20 }) {
    const animal = animals[animalKey];
    const history = [];
    let at = startDaysAgo;
    for (const [status, note, byShelter] of steps) {
      history.push({ status, note, changedBy: byShelter ? animal.shelter : adopter._id, changedAt: daysAgo(at) });
      at = Math.max(0, at - 3);
    }
    const last = history[history.length - 1];
    return Application.create({
      animal: animal._id,
      adopter: adopter._id,
      shelter: animal.shelter,
      type,
      fosterDuration,
      questionnaire: questionnaire(q),
      status: last.status,
      statusHistory: history,
      shelterNotes: [...steps].reverse().find(([, note, byShelter]) => byShelter && note)?.[1],
      matchScore: matchAnimal(adopter, animal).score,
      completedAt: last.status === 'completed' ? last.changedAt : undefined,
      createdAt: history[0].changedAt,
      updatedAt: last.changedAt,
    });
  }

  const S = (status, note) => [status, note, true];
  const A = (status, note) => [status, note, false];

  const lunaApp = await application({
    adopter: user,
    animalKey: 'luna',
    startDaysAgo: 38,
    q: { otherPets: '1 cat (4 years old)', reason: 'Luna will be a calm companion for our cat Simba.' },
    steps: [A('submitted', 'Application submitted'), S('under_review', 'Home visit booked'), S('approved', 'Lovely home visit, Luna is yours!'), S('completed', 'Luna went home today. Thank you!')],
  });
  lunaApp.completedAt = daysAgo(29);
  lunaApp.statusHistory[lunaApp.statusHistory.length - 1].changedAt = daysAgo(29);
  await lunaApp.save({ timestamps: false });

  const pepperApp = await application({
    adopter: user,
    animalKey: 'pepper',
    startDaysAgo: 1,
    q: { otherPets: '1 cat (4 years old)', reason: 'Pepper already lives with a cat, so she would fit right in with Simba and Luna.' },
    steps: [A('submitted', 'Application submitted')],
  });
  await application({
    adopter: user,
    animalKey: 'bella',
    startDaysAgo: 6,
    q: { otherPets: '2 cats' },
    steps: [A('submitted', 'Application submitted'), S('under_review', 'We will call you this week to arrange a meet-and-greet.')],
  });
  await application({
    adopter: user,
    animalKey: 'max',
    startDaysAgo: 15,
    steps: [A('submitted', 'Application submitted'), S('rejected', 'Max needs a ground-floor home because of his arthritis. Sorry!')],
  });
  await application({
    adopter: user,
    animalKey: 'tiger',
    startDaysAgo: 12,
    steps: [A('submitted', 'Application submitted'), A('withdrawn', 'We decided Tiger needs a quieter home.')],
  });

  await application({
    adopter: meera,
    animalKey: 'coco',
    type: 'foster',
    fosterDuration: '2 months',
    startDaysAgo: 2,
    q: { homeType: 'house', hasYard: true, hasKids: true, experience: 'some', workHoursPerDay: 4 },
    steps: [A('submitted', 'Application submitted')],
  });
  await application({
    adopter: asha,
    animalKey: 'biscuit',
    startDaysAgo: 9,
    q: { homeType: 'house', hasYard: true, hasKids: true, experience: 'experienced', workHoursPerDay: 5, otherPets: '1 dog' },
    steps: [A('submitted', 'Application submitted'), S('under_review'), S('approved', 'Please come and pick Biscuit up on Saturday.')],
  });
  const mittensApp = await application({
    adopter: ravi,
    animalKey: 'mittens',
    type: 'foster',
    fosterDuration: 'Until he is 6 months old',
    startDaysAgo: 18,
    steps: [A('submitted', 'Application submitted'), S('approved', 'Thanks for fostering!'), S('completed', 'Mittens is settling in with Ravi.')],
  });
  const daisyApp = await application({
    adopter: asha,
    animalKey: 'daisy',
    startDaysAgo: 70,
    q: { homeType: 'house', hasYard: true, hasKids: true, experience: 'experienced' },
    steps: [A('submitted', 'Application submitted'), S('approved'), S('completed', 'Daisy went home!')],
  });
  const cloudApp = await application({
    adopter: meera,
    animalKey: 'cloud',
    startDaysAgo: 100,
    q: { homeType: 'house', hasYard: true, hasKids: true },
    steps: [A('submitted', 'Application submitted'), S('approved'), S('completed', 'Cloud went home!')],
  });
  await application({
    adopter: asha,
    animalKey: 'bruno',
    startDaysAgo: 3,
    q: { homeType: 'house', hasYard: true, hasKids: true, experience: 'experienced', workHoursPerDay: 4 },
    steps: [A('submitted', 'Application submitted')],
  });

  const completedApps = [lunaApp, mittensApp, daisyApp, cloudApp];
  for (const app of completedApps) {
    const docs = CHECKIN_SCHEDULE.map(({ label, days }) => {
      const dueDate = new Date(app.completedAt.getTime() + days * DAY);
      const past = dueDate < new Date();
      return { application: app._id, animal: app.animal, adopter: app.adopter, shelter: app.shelter, label, dueDate, status: past ? 'completed' : 'upcoming' };
    });
    for (const d of docs) {
      if (d.status === 'completed') {
        d.completedAt = new Date(d.dueDate.getTime() + DAY);
        d.healthUpdate = { notes: 'Settled in well, eating and sleeping normally.', weightKg: 4.2, vetVisit: false, mood: 'happy' };
      }
    }
    await CheckIn.insertMany(docs);
  }

  const lunaWeek = await CheckIn.findOne({ application: lunaApp._id, label: '1 week' });
  lunaWeek.healthUpdate = {
    notes: 'Luna has made friends with Simba already! She sleeps on the sofa and has a great appetite.',
    weightKg: 3.8,
    vetVisit: true,
    vetNotes: 'First check-up at Banjara Vet Clinic: healthy, booster vaccine given.',
    mood: 'happy',
    photo: photo('19'),
  };
  await lunaWeek.save();
  await CheckIn.updateOne({ application: lunaApp._id, label: '1 month' }, { status: 'due', reminderSentAt: daysAgo(0) });

  await Review.create({ shelter: care._id, adopter: user._id, application: lunaApp._id, rating: 5, comment: 'Wonderful caregiver! Luna came home healthy, vaccinated and so well socialised.', createdAt: daysAgo(20) });
  await Review.create({ shelter: care._id, adopter: ravi._id, application: mittensApp._id, rating: 4, comment: 'Very helpful and quick to answer questions about fostering.', createdAt: daysAgo(8) });
  await Review.create({ shelter: happyTails._id, adopter: asha._id, application: daisyApp._id, rating: 5, comment: 'Smooth process and very caring staff.', createdAt: daysAgo(55) });
  await Review.create({ shelter: secShelter._id, adopter: meera._id, application: cloudApp._id, rating: 4, comment: 'Cloud is perfect. The home visit took a while but was worth it.', createdAt: daysAgo(80) });

  for (const [userId, count] of [
    [care._id, 2],
    [happyTails._id, 1],
    [secShelter._id, 1],
  ]) {
    await ShelterProfile.updateOne({ user: userId }, { adoptionCount: count });
  }

  async function conversation(a, b, animalKey, lines, unreadFor) {
    const convo = await Conversation.create({ participants: [a._id, b._id], animal: animals[animalKey]?._id });
    let last;
    for (const [i, [from, text]] of lines.entries()) {
      const sender = from === 'a' ? a : b;
      last = await Message.create({
        conversation: convo._id,
        sender: sender._id,
        text,
        readBy: i === lines.length - 1 && unreadFor ? [sender._id] : [a._id, b._id],
        createdAt: new Date(Date.now() - (lines.length - i) * 37 * 60 * 1000),
      });
    }
    convo.lastMessage = { text: last.text, sender: last.sender };
    convo.lastMessageAt = last.createdAt;
    if (unreadFor) convo.unread.set(String(unreadFor._id), 1);
    await convo.save();
    return convo;
  }

  const userCareChat = await conversation(user, care, 'pepper', [
    ['a', 'Hi! Is Pepper still available? She looks lovely.'],
    ['b', 'Hello! Yes she is. She is very gentle and already lives with my foster cat.'],
    ['a', 'That is perfect, we have Luna and Simba at home. How is she with stairs? We live on the 3rd floor.'],
    ['b', 'She handles stairs fine and there is a lift in most apartments anyway 😊'],
    ['a', 'Great, I have just sent in an application.'],
    ['b', 'Thank you! I will review it today. Could you visit this weekend to meet her?'],
  ], user);
  await conversation(user, happyTails, 'bella', [
    ['a', 'Hello, could I meet Bella this week?'],
    ['b', 'Of course! Thursday 5 pm works for us.'],
    ['a', 'Thursday is perfect, see you then.'],
  ]);
  await conversation(asha, care, 'biscuit', [
    ['a', 'We are so excited about Biscuit!'],
    ['b', 'He is excited too. See you Saturday!'],
  ]);

  const notes = [
    [user, 'checkin', '1 month check-in for Luna is due', 'Please share how Luna is doing: notes, weight, mood, a photo and any vet visits.', `/checkins/${(await CheckIn.findOne({ application: lunaApp._id, label: '1 month' }))._id}`, false, 0],
    [user, 'message', 'New message from Demo Caregiver', 'Thank you! I will review it today. Could you visit this weekend to meet her?', `/messages/${userCareChat._id}`, false, 0],
    [user, 'application', 'Application under review: Bella', 'We will call you this week to arrange a meet-and-greet.', null, false, 3],
    [user, 'application', 'Application rejected: Max', 'Max needs a ground-floor home because of his arthritis. Sorry!', null, true, 12],
    [user, 'application', 'Application completed: Luna', 'Luna went home today. Thank you!', `/applications/${lunaApp._id}`, true, 29],
    [care, 'application', 'New adoption application for Pepper', `Demo User applied (${pepperApp.matchScore}% match).`, `/applications/${pepperApp._id}`, false, 1],
    [care, 'application', 'New foster application for Coco', 'Meera Iyer applied.', null, false, 2],
    [care, 'review', 'New 5-star review', 'Demo User reviewed the adoption of Luna.', `/shelters/${care._id}`, true, 20],
    [care, 'verification', 'Your profile is verified!', 'A PawShare admin verified your profile. Adopters will now see a verified badge.', `/shelters/${care._id}`, true, 60],
    [kukatpally, 'system', 'Welcome to PawShare', 'Your profile is waiting for admin verification.', null, false, 5],
    [admin, 'system', 'Shelter awaiting verification', 'Kukatpally Paws Collective has asked to be verified.', '/dashboard?tab=shelters', false, 5],
  ];
  const appLinks = await Application.find({ adopter: user._id }).populate('animal', 'name').lean();
  for (const [to, type, title, body, link, isRead, ago] of notes) {
    const animalName = title.split(': ')[1];
    const fallback = appLinks.find((a) => a.animal.name === animalName);
    await Notification.create({ user: to._id, type, title, body, link: link || (fallback ? `/applications/${fallback._id}` : undefined), isRead, createdAt: daysAgo(ago) });
  }

  user.favourites = [animals.coco._id, animals.bella._id, animals.oreo._id, animals.pepper._id];
  await user.save();
  asha.favourites = [animals.bruno._id, animals.ginger._id];
  await asha.save();

  const [users, shelters, animalCount, apps, checkIns, reviews, messages] = await Promise.all([
    User.countDocuments(),
    ShelterProfile.countDocuments(),
    Animal.countDocuments(),
    Application.countDocuments(),
    CheckIn.countDocuments(),
    Review.countDocuments(),
    Message.countDocuments(),
  ]);

  console.log(`\nSeeded ${users} users, ${shelters} shelter profiles, ${animalCount} animals, ${apps} applications, ${checkIns} check-ins, ${reviews} reviews, ${messages} messages.\n`);
  console.log('Demo logins (password for every account: Test@12345)\n');
  console.table([
    { role: 'admin', name: 'Admin', email: 'admin@gmail.com' },
    { role: 'adopter', name: 'Demo User', email: 'user@gmail.com' },
    { role: 'shelter (individual caregiver, verified)', name: 'Demo Caregiver', email: 'care@gmail.com' },
    { role: 'shelter (verified)', name: 'Happy Tails Rescue', email: 'happytails@pawshare.org' },
    { role: 'shelter (verified)', name: 'Secunderabad Animal Shelter', email: 'secshelter@pawshare.org' },
    { role: 'shelter (awaiting verification)', name: 'Kukatpally Paws Collective', email: 'kukatpallypaws@pawshare.org' },
    { role: 'adopter', name: 'Asha Rao', email: 'asha@pawshare.org' },
    { role: 'adopter', name: 'Ravi Kumar', email: 'ravi@pawshare.org' },
    { role: 'adopter', name: 'Meera Iyer', email: 'meera@pawshare.org' },
  ]);

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error('Seeding failed:', err);
  await mongoose.disconnect();
  process.exit(1);
});
