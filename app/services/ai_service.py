from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate, HumanMessagePromptTemplate
from langchain_core.output_parsers import JsonOutputParser, PydanticOutputParser
from langchain_core.runnables import RunnableLambda
from langchain.schema import BaseOutputParser
from typing import List, Dict, Any, Optional
import json
import asyncio
from ..config import settings
from ..schemas import (
    QuestionGenerationRequest, 
    AnswerEvaluationRequest, 
    GeneratedQuestion, 
    AnswerEvaluation,
    EvaluationDetails
)

class QuestionGenerationChain:
    def __init__(self):
        self.llm = ChatGoogleGenerativeAI(
            model="gemini-2.5-flash-lite",
            google_api_key=settings.gemini_api_key,
            temperature=0.7,
            max_output_tokens=2000
        )
        
        self.prompt = ChatPromptTemplate.from_messages([
            ("system", """You are an expert interview question generator. Always respond with valid JSON only, no additional text.
            
Generate {total_questions} interview questions for a {experience_level} level {role} position at {company}.

Distribute questions across these categories: {categories}

{profile_context}

IMPORTANT: Respond with ONLY valid JSON, no additional text.

Format:
{{
  "questions": [
    {{
      "category": "technical",
      "question_text": "What is the time complexity of binary search?",
      "options": ["O(n)", "O(log n)", "O(n log n)", "O(1)"],
      "correct_answer": "b",
      "explanation": "Binary search divides the search space in half.",
      "difficulty": "medium"
    }},
    {{
      "category": "behavioral",
      "question_text": "Describe a challenging project you worked on.",
      "difficulty": "medium"
    }}
  ]
}}"""),
            ("human", "{input}")
        ])
        
        self.parser = JsonOutputParser()
        self.chain = self.prompt | self.llm | self.parser

    async def generate_questions(self, request: QuestionGenerationRequest) -> List[GeneratedQuestion]:
        try:
            print(f"🤖 Attempting AI question generation with 15s timeout...")
            profile_context = ""
            if request.target_companies or request.target_roles:
                profile_context = f"""
Candidate Profile Context:
{f"- Target Companies: {', '.join(request.target_companies)}" if request.target_companies else ""}
{f"- Target Roles: {', '.join(request.target_roles)}" if request.target_roles else ""}
Consider this background when crafting relevant questions."""

            input_data = {
                "total_questions": request.total_questions,
                "experience_level": request.experience_level,
                "role": request.role,
                "company": request.company,
                "categories": ", ".join(request.categories),
                "profile_context": profile_context,
                "input": "Generate interview questions"
            }
            
            # Add timeout to AI chain call
            result = await asyncio.wait_for(self.chain.ainvoke(input_data), timeout=15.0)
            
            questions = []
            for q_data in result.get("questions", []):
                questions.append(GeneratedQuestion(
                    category=q_data.get("category", "technical"),
                    question_text=q_data.get("question_text", ""),
                    options=q_data.get("options"),
                    correct_answer=q_data.get("correct_answer"),
                    explanation=q_data.get("explanation"),
                    difficulty=q_data.get("difficulty", "medium")
                ))
            
            if questions:
                print(f"✅ AI generated {len(questions)} questions successfully")
                return questions
            else:
                print("⚠️ AI returned empty questions, using fallback")
                return self._get_fallback_questions(request)
            
        except asyncio.TimeoutError:
            print(f"⏰ AI question generation timed out after 15s, using fallback questions")
            return self._get_fallback_questions(request)
        except Exception as e:
            print(f"❌ Error generating questions: {e}")
            return self._get_fallback_questions(request)

    def _get_fallback_questions(self, request: QuestionGenerationRequest) -> List[GeneratedQuestion]:
        """Fallback questions if AI fails"""
        fallback_questions = {
            "technical": [
                "Explain the time complexity of binary search and why it's efficient.",
                "Describe the main principles of Object-Oriented Programming and give examples of each.",
                "What is REST architecture and how would you implement a RESTful API?",
                "Explain the difference between PUT, POST, and PATCH HTTP methods.",
                "How do database indexes work and why are they important for query performance?",
            ],
            "behavioral": [
                "Describe a time when you had to work with a difficult team member. How did you handle it?",
                "Tell me about a challenging project you worked on. What made it challenging and how did you overcome it?",
                "How do you prioritize tasks when you have multiple deadlines?",
                "Describe a time when you had to learn a new technology quickly.",
                "Tell me about a mistake you made and how you handled it."
            ],
            "system_design": [
                "How would you design a URL shortening service like bit.ly?",
                "Design a chat application that can handle millions of users.",
                "How would you design a recommendation system for an e-commerce platform?",
                "Design a distributed cache system.",
                "How would you design a real-time collaborative document editor?"
            ]
        }
        
        questions = []
        for i in range(request.total_questions):
            category = request.categories[i % len(request.categories)]
            if category in fallback_questions:
                q_list = fallback_questions[category]
                question_text = q_list[i % len(q_list)]
                questions.append(GeneratedQuestion(
                    category=category,
                    question_text=question_text,
                    difficulty="medium"
                ))
        
        return questions

class AnswerEvaluationChain:
    def __init__(self):
        self.llm = ChatGoogleGenerativeAI(
            model="gemini-2.5-flash-lite",
            google_api_key=settings.gemini_api_key,
            temperature=0.3,
            max_output_tokens=500
        )
        
        self.prompt = ChatPromptTemplate.from_messages([
            ("system", """You are a strict interview evaluator. Always respond with valid JSON only.

Evaluate this interview answer focusing on technical accuracy and knowledge quality. Be STRICT with scoring. Respond with ONLY valid JSON:

Question: {question_text}
Category: {category}
Answer: {answer_text}

CRITICAL EVALUATION RULES:
1. If the answer is random gibberish, nonsensical text, or completely unrelated: SCORE 1
2. If the answer is too short (less than 10 meaningful words): SCORE 1-2
3. If the answer contains no technical content relevant to the question: SCORE 1-2

Evaluation Criteria:
1. TECHNICAL ACCURACY (Most Important): Is the core technical content correct?
2. Depth of Knowledge: Does it show understanding of underlying concepts?
3. Clarity: Is the explanation clear and easy to understand?
4. Relevance: Does it directly answer the question?
5. Structure: Is it well-organized?

Scoring Guidelines (BE STRICT):
- 9-10: Technically accurate with excellent depth and examples
- 7-8: Technically accurate with good understanding
- 5-6: Partially correct or missing key details
- 3-4: Significant technical errors or very superficial
- 1-2: Fundamentally incorrect, off-topic, gibberish, or too short

Format:
{{
  "score": 8,
  "feedback": "Detailed feedback focusing on technical accuracy and areas for improvement",
  "corrected_answer": "Provide the ideal/perfect answer that would get 9-10 points, demonstrating best practices and comprehensive understanding",
  "missing_points": "String listing the specific key points, concepts, or details that were missing from the user's answer. Do NOT return as array.",
  "evaluation_details": {{
    "clarity": 8,
    "depth": 7,
    "confidence": 8,
    "relevance": 9,
    "structure": 7
  }}
}}"""),
            ("human", "{input}")
        ])
        
        self.parser = JsonOutputParser()
        self.chain = self.prompt | self.llm | self.parser

    async def evaluate_answer(self, request: AnswerEvaluationRequest) -> AnswerEvaluation:
        try:
            input_data = {
                "question_text": request.question_text,
                "category": request.category,
                "answer_text": request.answer_text,
                "input": "Evaluate this answer"
            }
            
            result = await self.chain.ainvoke(input_data)
            
            evaluation_details = EvaluationDetails(
                clarity=result.get("evaluation_details", {}).get("clarity"),
                depth=result.get("evaluation_details", {}).get("depth"),
                confidence=result.get("evaluation_details", {}).get("confidence"),
                relevance=result.get("evaluation_details", {}).get("relevance"),
                structure=result.get("evaluation_details", {}).get("structure")
            )
            
            return AnswerEvaluation(
                score=result.get("score", 5.0),
                feedback=result.get("feedback", "Your answer shows understanding but could be improved."),
                corrected_answer=result.get("corrected_answer", ""),
                missing_points=result.get("missing_points", ""),
                evaluation_details=evaluation_details
            )
            
        except Exception as e:
            print(f"Error evaluating answer: {e}")
            return self._get_fallback_evaluation(request)

    def _get_fallback_evaluation(self, request: AnswerEvaluationRequest) -> AnswerEvaluation:
        """Fallback evaluation if AI fails"""
        answer_text = request.answer_text.strip().lower()
        score = 1.0  # Default low score for fallback
        feedback = "Unable to properly evaluate your answer. Please provide a more detailed technical response."
        
        # Check for nonsensical or very short answers
        if len(answer_text) < 10:
            score = 1.0
            feedback = "Your answer is too short. Please provide a more detailed explanation."
        elif self._is_nonsensical_answer(answer_text):
            score = 1.0
            feedback = "Your answer doesn't appear to address the question. Please provide a relevant technical response."
        else:
            # Simple keyword-based evaluation for specific questions
            if "binary search" in request.question_text.lower():
                if "o(log n)" in answer_text or "logarithmic" in answer_text:
                    score = 8.0
                    feedback = "Correct! Binary search has O(log n) time complexity because it divides the search space in half."
                elif "o(n)" in answer_text or "linear" in answer_text:
                    score = 2.0
                    feedback = "Incorrect! Binary search has O(log n) time complexity, not O(n)."
                else:
                    score = 3.0
                    feedback = "Your answer mentions binary search but lacks technical details about time complexity."
            else:
                # Generic evaluation for other questions
                score = 3.0
                feedback = "Your answer provides some information but lacks technical depth and clarity."
        
        return AnswerEvaluation(
            score=score,
            feedback=feedback,
            corrected_answer="Unable to provide corrected answer in fallback mode. Please try again later.",
            missing_points="Unable to analyze missing points in fallback mode. Please try again later.",
            evaluation_details=EvaluationDetails(
                clarity=max(score - 1, 1),
                depth=max(score - 2, 1),
                confidence=max(score - 1, 1),
                relevance=score,
                structure=max(score - 1, 1)
            )
        )
    
    def _is_nonsensical_answer(self, answer_text: str) -> bool:
        """Check if answer is nonsensical or random gibberish"""
        # Check for very random character patterns
        vowels = 'aeiou'
        consonants = 'bcdfghjklmnpqrstvwxyz'
        
        # Count vowels and consonants
        vowel_count = sum(1 for char in answer_text if char in vowels)
        consonant_count = sum(1 for char in answer_text if char in consonants)
        total_letters = vowel_count + consonant_count
        
        if total_letters == 0:
            return True
            
        # If vowel to consonant ratio is extremely unbalanced, likely gibberish
        if total_letters > 5:
            vowel_ratio = vowel_count / total_letters
            if vowel_ratio < 0.1 or vowel_ratio > 0.8:
                return True
        
        # Check for repeating character patterns that suggest gibberish
        if len(set(answer_text.replace(' ', ''))) < 4 and len(answer_text) > 8:
            return True
            
        # Check for lack of spaces in long text (likely gibberish)
        if len(answer_text) > 15 and ' ' not in answer_text:
            return True
            
        return False

class RecommendationChain:
    def __init__(self):
        self.llm = ChatGoogleGenerativeAI(
            model="gemini-2.5-flash-lite",
            google_api_key=settings.gemini_api_key,
            temperature=0.7,
            max_output_tokens=800
        )
        
        self.prompt = ChatPromptTemplate.from_messages([
            ("system", """You are an expert career advisor. Always respond with valid JSON only.

Generate 3-4 specific, actionable improvement recommendations for this interview performance. Respond with ONLY valid JSON:

PERFORMANCE DATA:
Overall Score: {overall_score}/10
Category Scores: {category_scores}
Identified Strengths: {strengths}
Areas for Improvement: {weaknesses}
Lowest scoring area: {worst_category}
Highest scoring area: {best_category}

INSTRUCTIONS:
- Focus on the lowest-scoring categories for improvement suggestions
- Be specific about what to practice (e.g., "Practice explaining time complexity of algorithms with examples")  
- Include actionable steps (e.g., "Solve 3-5 medium-level LeetCode problems daily")
- Mention resources when relevant (books, courses, practice platforms)
- Keep recommendations practical and achievable

{{
  "recommendations": [
    "Specific actionable recommendation based on lowest scores",
    "Another targeted improvement suggestion", 
    "Third practical recommendation with specific steps"
  ]
}}"""),
            ("human", "{input}")
        ])
        
        self.parser = JsonOutputParser()
        self.chain = self.prompt | self.llm | self.parser

    async def generate_recommendations(
        self, 
        overall_score: float,
        category_scores: Dict[str, float],
        strengths: List[str],
        weaknesses: List[str]
    ) -> List[str]:
        try:
            worst_category = min(category_scores.items(), key=lambda x: x[1]) if category_scores else ("N/A", 0)
            best_category = max(category_scores.items(), key=lambda x: x[1]) if category_scores else ("N/A", 0)
            
            input_data = {
                "overall_score": f"{overall_score:.1f}",
                "category_scores": ", ".join([f"{cat}: {score:.1f}/10" for cat, score in category_scores.items()]),
                "strengths": "; ".join(strengths) if strengths else "None identified",
                "weaknesses": "; ".join(weaknesses) if weaknesses else "None identified",
                "worst_category": f"{worst_category[0]} ({worst_category[1]:.1f}/10)",
                "best_category": f"{best_category[0]} ({best_category[1]:.1f}/10)",
                "input": "Generate recommendations"
            }
            
            result = await self.chain.ainvoke(input_data)
            return result.get("recommendations", self._get_fallback_recommendations())
            
        except Exception as e:
            print(f"Error generating recommendations: {e}")
            return self._get_fallback_recommendations()

    def _get_fallback_recommendations(self) -> List[str]:
        return [
            "Practice explaining technical concepts in simple terms",
            "Work on structuring your answers with clear beginning, middle, and end",
            "Prepare specific examples from your experience to illustrate your points",
            "Practice active listening and asking clarifying questions"
        ]

# AI Service orchestrator
class AIService:
    def __init__(self):
        self.question_generator = QuestionGenerationChain()
        self.answer_evaluator = AnswerEvaluationChain()
        self.recommendation_generator = RecommendationChain()

    async def generate_questions(self, request: QuestionGenerationRequest) -> List[GeneratedQuestion]:
        return await self.question_generator.generate_questions(request)

    async def evaluate_answer(self, request: AnswerEvaluationRequest) -> AnswerEvaluation:
        return await self.answer_evaluator.evaluate_answer(request)

    async def generate_recommendations(
        self, 
        overall_score: float,
        category_scores: Dict[str, float],
        strengths: List[str],
        weaknesses: List[str]
    ) -> List[str]:
        return await self.recommendation_generator.generate_recommendations(
            overall_score, category_scores, strengths, weaknesses
        )

# Global AI service instance
ai_service = AIService()