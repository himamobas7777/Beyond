/* REAL opportunities.
   Each entry was read from its official page on 2026-10-11. Only what the page states is recorded.
   Where the page does not say something, the field says "Not stated" and the app tells people to check the official page.
   Keep `lastVerified` honest: update it only after re-reading the official page. */
const CHECKED = '2026-10-11';
const CATEGORIES = ['Competitions', 'Research', 'Activities', 'Volunteering', 'Courses', 'Scholarships', 'Universities'];
const CAT_COLOR = { Competitions: '#22D3EE', Research: '#A78BFA', Activities: '#FBBF24', Volunteering: '#4ADE80', Courses: '#60A5FA', Scholarships: '#F472B6', Universities: '#FB923C' };
const INTERESTS = ['Research', 'Science', 'Math', 'Medicine', 'Coding', 'Art', 'Debate', 'Entrepreneurship', 'Volunteering', 'Languages', 'Chess', 'Neuroscience'];
const STAGES = ['Middle school', 'High school', 'University', 'Other'];
const NS = 'Not stated';

const OPP = (o) => Object.assign({ published: true, featured: false, deadline: null, lastVerified: CHECKED }, o);

const BUILTIN_OPPS = [
  OPP({ id: 'isef', featured: true, title: 'Regeneron ISEF', org: 'Society for Science', category: 'Competitions', mode: 'In person', cost: NS,
    grade: 'High school students (grades not stated)', eligibility: 'Students qualify by winning at a Society-affiliated local, regional, state or national science fair.',
    deadline: null, descr: 'The world’s largest international pre-college science competition. Finalists are judged by doctoral-level scientists. The finals are held in a host city each year, and a virtual fair lets people view projects.',
    tags: ['science', 'research'], url: 'https://www.societyforscience.org/isef/' }),
  OPP({ id: 'rsi', featured: true, title: 'Research Science Institute (RSI)', org: 'Center for Excellence in Education', category: 'Research', mode: 'In person', cost: 'Free',
    grade: 'High school juniors (seniors are not eligible)', eligibility: 'High school juniors. The page states the program is cost-free to students.',
    deadline: 'Dec 11, 2026, 11:59pm (RSI 2027)', descr: 'A summer science and engineering program that pairs on-campus STEM classes with a five-week research internship under expert mentors. Held at MIT, and for 2027 it expands to Stanford for 50 scholars.',
    tags: ['research', 'science'], url: 'https://www.cee.org/research-science-institute' }),
  OPP({ id: 'primes', title: 'MIT PRIMES', org: 'MIT Mathematics', category: 'Research', mode: 'Hybrid', cost: 'Free',
    grade: 'Grades 10-11 (sophomores and juniors)', eligibility: 'MIT PRIMES is for Greater Boston students (in person). PRIMES-USA is for students elsewhere in the U.S. (remote). Yulia’s Dream is for students from Ukraine. Check the official page for who can apply.',
    deadline: 'Nov 2, 2026 (PRIMES, PRIMES-USA, PRIMES Circle)', descr: 'A year-long research program in mathematics, engineering and science for high school students, with four sections. The page describes all sections as free.',
    tags: ['math', 'research', 'science'], url: 'https://math.mit.edu/research/highschool/primes/' }),
  OPP({ id: 'cs50x', title: 'CS50x: Intro to Computer Science', org: 'Harvard University', category: 'Courses', mode: 'Online', cost: 'Free',
    grade: 'Anyone, with or without programming experience', eligibility: 'Open to everyone. Submitting problem sets for feedback requires an edX account. Costs of optional certificates are not stated on the page.',
    descr: 'Harvard’s introductory computer science course: computational thinking, algorithms and data structures, starting in C and moving through Python, SQL and web programming before a final project.',
    tags: ['coding'], url: 'https://cs50.harvard.edu/x/' }),
  OPP({ id: 'ocw', title: 'MIT OpenCourseWare', org: 'Massachusetts Institute of Technology', category: 'Courses', mode: 'Online', cost: 'Free',
    grade: 'Anyone in the world', eligibility: 'No registration required for the free lecture notes, exams and videos.',
    descr: 'A free web publication of virtually all MIT course content that you can work through at your own pace.',
    tags: ['science', 'coding', 'math'], url: 'https://ocw.mit.edu/' }),
  OPP({ id: 'khan', title: 'Khan Academy', org: 'Khan Academy', category: 'Courses', mode: 'Online', cost: 'Free',
    grade: 'K-12 and early college', eligibility: 'For students, teachers and parents.',
    descr: 'A nonprofit offering 840+ free courses in core academic subjects, with apps on the Apple App Store and Google Play.',
    tags: ['math', 'science'], url: 'https://www.khanacademy.org/about' }),
  OPP({ id: 'kaggle-learn', title: 'Kaggle Learn', org: 'Kaggle', category: 'Courses', mode: 'Online', cost: 'Free',
    grade: NS, eligibility: NS,
    descr: 'Short tutorials for building practical data skills, including Python, data visualization and Pandas.',
    tags: ['coding'], url: 'https://www.kaggle.com/learn' }),
  OPP({ id: 'freecodecamp', title: 'freeCodeCamp', org: 'freeCodeCamp.org', category: 'Courses', mode: 'Online', cost: 'Free',
    grade: NS, eligibility: NS,
    descr: 'The site describes itself as a place to learn to code for free.',
    tags: ['coding'], url: 'https://www.freecodecamp.org/' }),
  OPP({ id: 'chevening', title: 'Chevening Scholarships', org: 'Chevening', category: 'Scholarships', mode: 'In person', cost: 'Funded',
    grade: 'One-year master’s degrees in the UK', eligibility: 'See the official “Who can apply?” page. Eligibility is not listed on the scholarships page.',
    descr: 'Fully funded scholarships for outstanding emerging leaders from around the world to study a one-year master’s degree in the UK. What the funding covers is not stated on this page.',
    tags: ['entrepreneurship'], url: 'https://www.chevening.org/scholarships/' }),
  OPP({ id: 'fulbright', title: 'Fulbright Foreign Student Program', org: 'Fulbright Program', category: 'Scholarships', mode: 'In person', cost: 'Funded',
    grade: 'Graduate students, young professionals and artists from abroad', eligibility: 'Non-U.S. citizens apply through the Fulbright Commission, Foundation or U.S. Embassy in their home country.',
    descr: 'Grants that let graduate students, young professionals and artists from abroad study or conduct research in the United States. What the grants cover is not stated on this page.',
    tags: ['research'], url: 'https://foreign.fulbrightonline.org/' }),
  OPP({ id: 'daad', title: 'DAAD Scholarships (Germany)', org: 'DAAD', category: 'Scholarships', mode: 'In person', cost: 'Varies',
    grade: NS, eligibility: 'Levels of study are not stated on this page. Use the DAAD scholarship database to find matching offers.',
    descr: 'The German Academic Exchange Service is one of the organizations where international students can apply for a scholarship to study in Germany.',
    tags: ['languages'], url: 'https://www.daad.de/en/study-and-research-in-germany/scholarships/' }),
  OPP({ id: 'unv', title: 'United Nations Volunteers', org: 'UN Volunteers (UNV)', category: 'Volunteering', mode: 'Hybrid', cost: NS,
    grade: NS, eligibility: 'A minimum age is not stated on the homepage. Volunteers register in the Talent Pool. Check the official page for requirements.',
    descr: 'A United Nations programme that mobilizes volunteers in 150 countries. The site lists online volunteering as an option.',
    tags: ['volunteering'], url: 'https://www.unv.org/' }),
  OPP({ id: 'ioi', title: 'International Olympiad in Informatics (IOI)', org: 'IOI', category: 'Competitions', mode: NS, cost: NS,
    grade: 'Secondary school students (up to four per country)', eligibility: 'How students qualify is not stated on the homepage. Ask your national olympiad or team.',
    descr: 'An international computer science competition. Over two days, students compete individually on programming and algorithmic tasks. UNESCO and IFIP are patrons.',
    tags: ['coding', 'math'], url: 'https://ioinformatics.org/' }),
  OPP({ id: 'imo', title: 'International Mathematical Olympiad (IMO)', org: 'IMO', category: 'Competitions', mode: NS, cost: NS,
    grade: NS, eligibility: 'Age, school level and how students qualify are not stated on the homepage. Check with your national team.',
    descr: 'The official site of the International Mathematical Olympiad. It lists upcoming editions, including IMO 2026 in Shanghai and IMO 2027 in Budapest, Hungary.',
    tags: ['math'], url: 'https://www.imo-official.org/' }),
  OPP({ id: 'gsoc', title: 'Google Summer of Code', org: 'Google', category: 'Activities', mode: 'Online', cost: NS,
    grade: NS, eligibility: 'Age and student status are not stated on the homepage. Check the official eligibility pages before planning on it.',
    descr: 'A global online program that brings new contributors into open source software. You work on a 12+ week programming project with an open source organization, guided by mentors.',
    tags: ['coding'], url: 'https://summerofcode.withgoogle.com/' }),
  OPP({ id: 'intaward', title: 'Duke of Edinburgh’s International Award', org: 'The International Award Foundation', category: 'Activities', mode: NS, cost: NS,
    grade: 'Ages 14 to 24', eligibility: 'Open to young people aged 14 to 24 regardless of background, location, culture or ability.',
    descr: 'A non-formal education framework available in more than 130 countries that recognises achievements outside of school. Participants develop their interests and skills while making a difference in their communities.',
    tags: ['volunteering'], url: 'https://www.intaward.org/' })
];
