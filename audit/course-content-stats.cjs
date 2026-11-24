const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const application = path.join(root, 'NextSkill_205_247_261');
const readJson = filename => JSON.parse(fs.readFileSync(filename, 'utf8').replace(/^\uFEFF/u, ''));
const courses = readJson(path.join(application, 'Database', 'custom_courses.json'));
const questions = readJson(path.join(application, 'Database', 'custom_questions.json'));
const staleCourses = readJson(path.join(root, 'Database', 'custom_courses.json'));
const retired = id => id >= 2 && id <= 17;
const activeCourses = courses.filter(course => !retired(course.Id));
const activeQuestions = questions.filter(question => !retired(question.CourseId));
const lessons = activeCourses.flatMap(course => course.Lessons.map(lesson => ({ ...lesson, course })));
const lessonKey = (courseId, lessonId) => `${courseId}:${lessonId}`;
const questionsByLesson = Map.groupBy(activeQuestions, question => lessonKey(question.CourseId, question.LessonId));
const knownLessonKeys = new Set(lessons.map(lesson => lessonKey(lesson.course.Id, lesson.Id)));
const counts = (entries, key) => Object.fromEntries([...Map.groupBy(entries, key)].map(([name, group]) => [name, group.length]));
const mean = numbers => numbers.length === 0 ? null : Number((numbers.reduce((sum, number) => sum + number, 0) / numbers.length).toFixed(1));
const hasText = value => typeof value === 'string' && value.trim().length > 0;
const valid = question => hasText(question.Prompt)
    && question.Choices.length >= 2 && question.Choices.every(hasText)
    && Number.isInteger(question.CorrectChoice) && question.CorrectChoice >= 0
    && question.CorrectChoice < question.Choices.length;
const validVideo = lesson => /^[A-Za-z0-9_-]{11}$/u.test(lesson.VideoId)
    && lesson.VideoDurationSeconds > 0 && lesson.VideoDurationSeconds <= 7200;
const readingSections = lesson => (lesson.Reading ?? []).filter(section => hasText(section?.Heading) && hasText(section.Text));
const lessonHasQuiz = lesson => {
    const count = (questionsByLesson.get(lessonKey(lesson.course.Id, lesson.Id)) ?? []).filter(valid).length;
    return count >= 1 && count <= 20;
};
const startable = course => {
    const matches = lessons.filter(lesson => lesson.course.Id === course.Id);
    return matches.length > 0 && matches.every(lesson => (validVideo(lesson) || readingSections(lesson).length > 0) && lessonHasQuiz(lesson));
};

const normalized = value => value.normalize('NFKC').toLocaleLowerCase('en-US').replace(/[^\p{L}\p{N}\p{M}]/gu, '');
const charLength = value => Array.from(value.trim()).length;
const trigrams = value => {
    const chars = Array.from(normalized(value));
    return new Set(chars.slice(0, -2).map((_, i) => chars.slice(i, i + 3).join('')));
};
const promptGrams = activeQuestions.map(question => trigrams(question.Prompt));
const similarPrompts = [];
for (let first = 0; first < activeQuestions.length; first++) {
    for (let second = first + 1; second < activeQuestions.length; second++) {
        const a = promptGrams[first];
        const b = promptGrams[second];
        const shared = [...a].filter(gram => b.has(gram)).length;
        const similarity = shared / (a.size + b.size - shared);
        if (similarity >= 0.35) similarPrompts.push({ a: activeQuestions[first].Id, b: activeQuestions[second].Id, similarity: Number(similarity.toFixed(3)) });
    }
}
similarPrompts.sort((a, b) => b.similarity - a.similarity);
const exactPromptGroups = Object.values(Object.groupBy(activeQuestions, question => normalized(question.Prompt))).filter(group => group.length > 1);
const validQuestions = activeQuestions.filter(valid);
const correctLengths = [];
const distractorLengths = [];
const lengthGuessCredit = [];
let uniqueLongest = 0;
let tiesLongest = 0;
let uniqueShortest = 0;
for (const question of validQuestions) {
    const correct = charLength(question.Choices[question.CorrectChoice]);
    const distractors = question.Choices.filter((_, index) => index !== question.CorrectChoice).map(charLength);
    correctLengths.push(correct);
    distractorLengths.push(...distractors);
    const maxDistractor = Math.max(...distractors);
    if (correct > maxDistractor) uniqueLongest++;
    if (correct === maxDistractor) tiesLongest++;
    if (correct < Math.min(...distractors)) uniqueShortest++;
    lengthGuessCredit.push(correct < maxDistractor ? 0 : 1 / (1 + distractors.filter(length => length === correct).length));
}

const coverFiles = activeCourses.map(course => `${course.Id}.webp`);
const coverDirectory = path.join(application, 'wwwroot', 'images', 'courses', 'topic-covers');
console.log(JSON.stringify({
    files: { appCourses: courses.length, appQuestions: questions.length, rootCourses: staleCourses.length,
        rootCourseIds: staleCourses.map(course => course.Id), rootQuestionsExists: fs.existsSync(path.join(root, 'Database', 'custom_questions.json')) },
    activeCourses: { count: activeCourses.length, ids: activeCourses.map(course => course.Id), featured: activeCourses.filter(course => course.Featured).length,
        category: counts(activeCourses, course => course.Category), level: counts(activeCourses, course => course.Level),
        lessonCounts: counts(activeCourses, course => course.Lessons.length), coursesStartableByContentRules: activeCourses.filter(startable).length,
        unitsMismatch: activeCourses.filter(course => course.Units !== course.Lessons.length).map(course => course.Id),
        instructorsMatchAnyLessonCreator: activeCourses.filter(course => course.Lessons.some(lesson => course.Instructor === lesson.VideoCreator)).length,
        textMetadata: activeCourses.map(course => ({ id: course.Id, title: course.Title, level: course.Level, instructor: course.Instructor })) },
    lessons: { count: lessons.length, withVideo: lessons.filter(validVideo).length,
        withReading: lessons.filter(lesson => readingSections(lesson).length > 0).length,
        withSummary: lessons.filter(lesson => hasText(lesson.Summary)).length,
        missingMedia: lessons.filter(lesson => !validVideo(lesson) && !readingSections(lesson).length).map(lesson => lessonKey(lesson.course.Id, lesson.Id)),
        validQuestionsPerLesson: counts(lessons, lesson => (questionsByLesson.get(lessonKey(lesson.course.Id, lesson.Id)) ?? []).filter(valid).length),
        videoIdMultiplicity: counts([...Map.groupBy(lessons.filter(validVideo), lesson => lesson.VideoId).values()], group => group.length),
        creators: counts(lessons.filter(validVideo), lesson => lesson.VideoCreator),
        withCourseVideoUrl: activeCourses.filter(course => hasText(course.VideoUrl)).length },
    questions: { count: activeQuestions.length, valid: validQuestions.length,
        invalid: activeQuestions.filter(question => !valid(question)).map(question => question.Id),
        orphans: activeQuestions.filter(question => !knownLessonKeys.has(lessonKey(question.CourseId, question.LessonId))).map(question => question.Id),
        optionCounts: counts(activeQuestions, question => question.Choices.length),
        answerPositions: counts(validQuestions, question => String.fromCharCode(65 + question.CorrectChoice)),
        answerPositionsByChoiceCount: Object.fromEntries([...Map.groupBy(validQuestions, question => question.Choices.length)]
            .map(([count, group]) => [count, counts(group, question => String.fromCharCode(65 + question.CorrectChoice))])),
        noExplanation: activeQuestions.filter(question => !hasText(question.Explanation)).length,
        noHint: activeQuestions.filter(question => !hasText(question.Hint)).length,
        noCoaching: activeQuestions.filter(question => !hasText(question.Coaching)).length,
        duplicateIds: Object.values(Object.groupBy(activeQuestions, question => question.Id)).filter(group => group.length > 1).map(group => group[0].Id),
        exactNormalizedPromptGroups: exactPromptGroups.map(group => group.map(question => question.Id)),
        nearPromptPairsAt035: similarPrompts.length, topNearPromptPairs: similarPrompts.slice(0, 12),
        meanCorrectCharacters: mean(correctLengths), meanDistractorCharacters: mean(distractorLengths), uniqueLongest, tiesLongest, uniqueShortest,
        uniformGuessPercent: mean(validQuestions.map(question => 100 / question.Choices.length)),
        chooseLongestExpectedPercent: mean(lengthGuessCredit.map(credit => 100 * credit)) },
    coverFiles: { expected: coverFiles.length, absent: coverFiles.filter(name => !fs.existsSync(path.join(coverDirectory, name))) }
}, null, 2));
