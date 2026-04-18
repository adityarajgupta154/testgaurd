import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, doc, deleteDoc, query, where } from 'firebase/firestore';
import { db } from '../../services/firebase/config';
import { Plus, Trash2, List, ArrowLeft, Loader2 } from 'lucide-react';

const TestManagement = () => {
  const [tests, setTests] = useState([]);
  const [newTest, setNewTest] = useState({ title: '', duration: '' });
  
  // Question Management State
  const [selectedTest, setSelectedTest] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [isSavingQuestion, setIsSavingQuestion] = useState(false);
  const [newQuestion, setNewQuestion] = useState({
    question: '',
    option1: '',
    option2: '',
    option3: '',
    option4: '',
    correctAnswer: ''
  });

  const fetchTests = async () => {
    try {
      const snap = await getDocs(collection(db, 'tests'));
      setTests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error("Error fetching tests", e); }
  };

  useEffect(() => { 
    fetchTests(); 
  }, []);

  const handleAddTest = async (e) => {
    e.preventDefault();
    if (!newTest.title || !newTest.duration) return;
    try {
      await addDoc(collection(db, 'tests'), {
        title: newTest.title,
        duration: parseInt(newTest.duration),
        shuffle: true,
        createdAt: Date.now()
      });
      setNewTest({ title: '', duration: '' });
      fetchTests();
    } catch(e) { console.error(e); }
  };

  const handleDeleteTest = async (id) => {
    if(window.confirm('Are you sure you want to delete this test?')) {
      try {
        await deleteDoc(doc(db, 'tests', id));
        fetchTests();
      } catch (e) { console.error("Error deleting test", e); }
    }
  };

  // --- Question Management Handlers --- //

  const handleManageQuestions = (test) => {
    setSelectedTest(test);
    fetchQuestions(test.id);
  };

  const fetchQuestions = async (testId) => {
    try {
      const q = query(collection(db, 'questions'), where('testId', '==', testId));
      const snap = await getDocs(q);
      setQuestions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error("Error fetching questions", e);
    }
  };

  const handleAddQuestion = async (e) => {
    e.preventDefault();
    const { question, option1, option2, option3, option4, correctAnswer } = newQuestion;

    if (!question || !option1 || !option2 || !option3 || !option4 || !correctAnswer) {
      alert("Please fill out all fields. Ensure a correct answer is selected.");
      return;
    }

    const optionsArray = [option1, option2, option3, option4];
    
    let resolvedCorrectAnswer = "";
    if (correctAnswer === "1") resolvedCorrectAnswer = option1;
    if (correctAnswer === "2") resolvedCorrectAnswer = option2;
    if (correctAnswer === "3") resolvedCorrectAnswer = option3;
    if (correctAnswer === "4") resolvedCorrectAnswer = option4;

    if (!resolvedCorrectAnswer || !optionsArray.includes(resolvedCorrectAnswer)) {
      alert("Correct answer logic mismatch. Try again.");
      return;
    }

    setIsSavingQuestion(true);
    try {
      await addDoc(collection(db, 'questions'), {
        question: question,
        options: optionsArray,
        correctAnswer: resolvedCorrectAnswer,
        testId: selectedTest.id,
        createdAt: Date.now()
      });
      alert("Question added successfully!");
      setNewQuestion({ question: '', option1: '', option2: '', option3: '', option4: '', correctAnswer: '' });
      fetchQuestions(selectedTest.id);
    } catch (err) {
      console.error("Failed to save question", err);
      alert("Error saving question.");
    } finally {
      setIsSavingQuestion(false);
    }
  };

  const handleDeleteQuestion = async (id) => {
    if(window.confirm('Are you sure you want to delete this question?')) {
      try {
        await deleteDoc(doc(db, 'questions', id));
        fetchQuestions(selectedTest.id);
      } catch (e) { console.error("Error deleting question", e); }
    }
  };

  if (selectedTest) {
    return (
      <div className="space-y-8">
        <div className="flex items-center space-x-4">
          <button onClick={() => setSelectedTest(null)} className="p-2 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 text-gray-600 transition">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Manage Questions</h2>
            <p className="text-gray-500 text-sm">Test: {selectedTest.title}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold mb-4 text-gray-800">Add New MCQ Question</h3>
          <form onSubmit={handleAddQuestion} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Question</label>
              <textarea 
                className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none min-h-[100px]"
                placeholder="Enter question text here..."
                value={newQuestion.question}
                onChange={e => setNewQuestion({...newQuestion, question: e.target.value})}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Option 1</label>
                <input type="text" className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" 
                  value={newQuestion.option1} onChange={e => setNewQuestion({...newQuestion, option1: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Option 2</label>
                <input type="text" className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" 
                  value={newQuestion.option2} onChange={e => setNewQuestion({...newQuestion, option2: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Option 3</label>
                <input type="text" className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" 
                  value={newQuestion.option3} onChange={e => setNewQuestion({...newQuestion, option3: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Option 4</label>
                <input type="text" className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" 
                  value={newQuestion.option4} onChange={e => setNewQuestion({...newQuestion, option4: e.target.value})} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Correct Answer</label>
              <select 
                className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                value={newQuestion.correctAnswer}
                onChange={e => setNewQuestion({...newQuestion, correctAnswer: e.target.value})}
              >
                <option value="" disabled>Select correct option</option>
                <option value="1">Option 1 (Matches above)</option>
                <option value="2">Option 2 (Matches above)</option>
                <option value="3">Option 3 (Matches above)</option>
                <option value="4">Option 4 (Matches above)</option>
              </select>
            </div>

            <button 
              type="submit" 
              disabled={isSavingQuestion}
              className={`mt-4 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 flex items-center justify-center font-medium shadow-sm transition w-full md:w-auto ${isSavingQuestion ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {isSavingQuestion ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Plus className="w-5 h-5 mr-2" />} 
              {isSavingQuestion ? 'Saving Question...' : 'Add Question'}
            </button>
          </form>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
           <h3 className="text-lg font-bold mb-4 text-gray-800">Existing Questions</h3>
           <div className="space-y-4">
              {questions.map((q, index) => (
                <div key={q.id} className="p-4 border border-gray-200 rounded-lg bg-gray-50 flex flex-col sm:flex-row justify-between items-start gap-4 hover:bg-white transition">
                   <div className="flex-1">
                     <div className="font-bold text-gray-900 text-lg mb-2">Q{index + 1}. {q.question}</div>
                     <ul className="list-disc pl-5 text-sm text-gray-600 space-y-1 mb-3">
                       {q.options.map((opt, i) => (
                         <li key={i} className={opt === q.correctAnswer ? "font-bold text-green-600" : ""}>
                           {opt} {opt === q.correctAnswer && " (Correct)"}
                         </li>
                       ))}
                     </ul>
                   </div>
                   <button onClick={() => handleDeleteQuestion(q.id)} className="text-red-600 hover:text-red-800 hover:bg-red-50 bg-white border border-gray-200 p-2 rounded-lg transition shrink-0">
                     <Trash2 className="w-5 h-5" />
                   </button>
                </div>
              ))}
              {questions.length === 0 && (
                <div className="text-center py-8 text-gray-500">No questions added yet.</div>
              )}
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-gray-900">Test Management</h2>
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
         <h3 className="text-lg font-bold mb-4 text-gray-800">Create New Test</h3>
         <form onSubmit={handleAddTest} className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
           <input type="text" placeholder="Test Title" className="flex-1 border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" value={newTest.title} onChange={e=>setNewTest({...newTest, title: e.target.value})}/>
           <input type="number" placeholder="Duration (mins)" className="w-full sm:w-40 border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" value={newTest.duration} onChange={e=>setNewTest({...newTest, duration: e.target.value})}/>
           <button type="submit" className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 flex items-center justify-center font-medium shadow-sm transition"><Plus className="w-5 h-5 mr-2" /> Create</button>
         </form>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
         <h3 className="text-lg font-bold mb-4 text-gray-800">Existing Tests</h3>
         <div className="space-y-4">
            {tests.map(test => (
              <div key={test.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 border border-gray-200 rounded-lg bg-gray-50 hover:bg-white transition">
                 <div className="mb-4 sm:mb-0">
                   <div className="font-bold text-gray-900 text-lg">{test.title}</div>
                   <div className="text-sm font-medium text-gray-500 flex items-center mt-1"><span className="w-2 h-2 rounded-full bg-blue-500 mr-2"></span>{test.duration} minutes total</div>
                 </div>
                 <div className="flex items-center space-x-3 w-full sm:w-auto">
                   <button onClick={() => handleManageQuestions(test)} className="flex-1 sm:flex-none text-blue-600 hover:text-blue-800 hover:bg-blue-50 bg-white border border-gray-200 px-4 py-2 rounded-lg flex items-center justify-center font-medium transition"><List className="w-4 h-4 mr-2" /> Manage Questions</button>
                   <button onClick={() => handleDeleteTest(test.id)} className="text-red-600 hover:text-red-800 hover:bg-red-50 bg-white border border-gray-200 p-2 rounded-lg transition"><Trash2 className="w-5 h-5" /></button>
                 </div>
              </div>
            ))}
            {tests.length === 0 && (
              <div className="text-center py-8 text-gray-500">No tests created yet.</div>
            )}
         </div>
      </div>
    </div>
  );
};
export default TestManagement;
