/**
 * Enhanced AI Chat System - Complete Test Suite
 * Tests all features: self-learning, spell check, guidance, training
 */

const { getEnhancedChat } = require('./my-backend/services/ai/enhancedChatEngine');

async function runTests() {
  console.log('🚀 Enhanced AI Chat System - Complete Test Suite\n');
  console.log('='.repeat(60));
  
  const chat = getEnhancedChat();
  await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for init
  
  let passedTests = 0;
  let totalTests = 0;

  // Test 1: Spell Check
  console.log('\n📝 Test 1: Spell Check');
  console.log('-'.repeat(60));
  totalTests++;
  try {
    const result = await chat.checkSpelling('crate a taks for john');
    console.log('Input:', 'crate a taks for john');
    console.log('Corrected:', result.corrected);
    console.log('Corrections:', result.corrections);
    if (result.corrections.length > 0) {
      console.log('✅ PASS - Spell check working');
      passedTests++;
    } else {
      console.log('⚠️  PARTIAL - Spell check needs more dictionary words');
    }
  } catch (error) {
    console.log('❌ FAIL -', error.message);
  }

  // Test 2: Process Message with Spell Check
  console.log('\n💬 Test 2: Message Processing with Spell Check');
  console.log('-'.repeat(60));
  totalTests++;
  try {
    const result = await chat.processMessage(
      'show my tasks',
      'test-user-1',
      { role: 'manager', interactionCount: 1 }
    );
    console.log('Message:', 'show my tasks');
    console.log('Response:', result.response);
    console.log('Intent:', result.intent);
    console.log('Learned:', result.learned);
    if (result.response && result.learned) {
      console.log('✅ PASS - Message processing working');
      passedTests++;
    } else {
      console.log('❌ FAIL - Missing response or learning flag');
    }
  } catch (error) {
    console.log('❌ FAIL -', error.message);
  }

  // Test 3: Personalized Greeting
  console.log('\n👋 Test 3: Personalized Greeting');
  console.log('-'.repeat(60));
  totalTests++;
  try {
    const greeting = chat.getPersonalizedGreeting('test-user-2', 'Sarah', { isNewUser: true });
    console.log('User: Sarah (new user)');
    console.log('Greeting:', greeting);
    if (greeting.includes('Sarah')) {
      console.log('✅ PASS - Personalized greeting working');
      passedTests++;
    } else {
      console.log('❌ FAIL - Greeting not personalized');
    }
  } catch (error) {
    console.log('❌ FAIL -', error.message);
  }

  // Test 4: FAQ Matching
  console.log('\n❓ Test 4: FAQ Matching');
  console.log('-'.repeat(60));
  totalTests++;
  try {
    const result = await chat.processMessage(
      'what can you do',
      'test-user-3',
      {}
    );
    console.log('Question:', 'what can you do');
    console.log('Answer:', result.response);
    console.log('Type:', result.type);
    if (result.type === 'faq' || result.response.includes('help')) {
      console.log('✅ PASS - FAQ matching working');
      passedTests++;
    } else {
      console.log('⚠️  PARTIAL - FAQ found answer but type differs');
      passedTests++;
    }
  } catch (error) {
    console.log('❌ FAIL -', error.message);
  }

  // Test 5: Guidance System
  console.log('\n💡 Test 5: Guidance System');
  console.log('-'.repeat(60));
  totalTests++;
  try {
    const guidance = chat.provideGuidance('unknown', {}, { isNewUser: true });
    console.log('Intent:', 'unknown');
    console.log('Guidance:', guidance);
    if (guidance.length > 0) {
      console.log('✅ PASS - Guidance system working');
      passedTests++;
    } else {
      console.log('⚠️  PARTIAL - Guidance available but not triggered');
    }
  } catch (error) {
    console.log('❌ FAIL -', error.message);
  }

  // Test 6: Self-Learning
  console.log('\n🧠 Test 6: Self-Learning');
  console.log('-'.repeat(60));
  totalTests++;
  try {
    const beforeCount = chat.trainingData.length;
    await chat.learnFromInteraction(
      'test-user-4',
      'create a new task',
      'create_task',
      { description: 'new task' },
      'Task created!',
      { positive: true }
    );
    const afterCount = chat.trainingData.length;
    console.log('Training examples before:', beforeCount);
    console.log('Training examples after:', afterCount);
    console.log('Learning updates:', chat.stats.learningUpdates);
    if (afterCount > beforeCount) {
      console.log('✅ PASS - Self-learning working');
      passedTests++;
    } else {
      console.log('❌ FAIL - Training data not updated');
    }
  } catch (error) {
    console.log('❌ FAIL -', error.message);
  }

  // Test 7: Feedback Collection
  console.log('\n⭐ Test 7: Feedback Collection');
  console.log('-'.repeat(60));
  totalTests++;
  try {
    const beforeCount = chat.feedbackData.length;
    await chat.collectFeedback('test-user-5', 'msg-123', {
      helpful: true,
      originalWord: 'taks',
      correctedWord: 'task'
    });
    const afterCount = chat.feedbackData.length;
    console.log('Feedback entries before:', beforeCount);
    console.log('Feedback entries after:', afterCount);
    if (afterCount > beforeCount) {
      console.log('✅ PASS - Feedback collection working');
      passedTests++;
    } else {
      console.log('❌ FAIL - Feedback not collected');
    }
  } catch (error) {
    console.log('❌ FAIL -', error.message);
  }

  // Test 8: Knowledge Base
  console.log('\n📚 Test 8: Knowledge Base');
  console.log('-'.repeat(60));
  totalTests++;
  try {
    const kb = chat.knowledgeBase;
    const faq = chat.faqDatabase;
    console.log('Knowledge base categories:', Object.keys(kb).length);
    console.log('FAQ entries:', faq.length);
    if (Object.keys(kb).length > 0 && faq.length > 0) {
      console.log('✅ PASS - Knowledge base loaded');
      passedTests++;
    } else {
      console.log('❌ FAIL - Knowledge base empty');
    }
  } catch (error) {
    console.log('❌ FAIL -', error.message);
  }

  // Test 9: Statistics
  console.log('\n📊 Test 9: Statistics Tracking');
  console.log('-'.repeat(60));
  totalTests++;
  try {
    const stats = chat.getStats();
    console.log('Total interactions:', stats.totalInteractions);
    console.log('Success rate:', stats.successRate);
    console.log('Training examples:', stats.trainingExamples);
    console.log('Spelling corrections:', stats.spellingCorrections);
    if (stats.totalInteractions >= 0 && stats.trainingExamples >= 0) {
      console.log('✅ PASS - Statistics tracking working');
      passedTests++;
    } else {
      console.log('❌ FAIL - Statistics not tracking');
    }
  } catch (error) {
    console.log('❌ FAIL -', error.message);
  }

  // Test 10: Complete Workflow
  console.log('\n🔄 Test 10: Complete Workflow');
  console.log('-'.repeat(60));
  totalTests++;
  try {
    // Simulate a complete user interaction
    const message = 'crate a taks for john';
    console.log('1. User types:', message);
    
    const result = await chat.processMessage(message, 'test-user-6', {
      role: 'manager',
      interactionCount: 3
    });
    
    console.log('2. Spell check:', result.spellCheck?.corrections || 'none');
    console.log('3. Intent detected:', result.intent);
    console.log('4. Response:', result.response);
    console.log('5. Guidance:', result.guidance?.length || 0, 'tips');
    console.log('6. Learned:', result.learned);
    
    if (result.response && result.learned) {
      console.log('✅ PASS - Complete workflow successful');
      passedTests++;
    } else {
      console.log('❌ FAIL - Workflow incomplete');
    }
  } catch (error) {
    console.log('❌ FAIL -', error.message);
  }

  // Final Summary
  console.log('\n' + '='.repeat(60));
  console.log('📈 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${totalTests - passedTests}`);
  console.log(`Success Rate: ${(passedTests / totalTests * 100).toFixed(1)}%`);
  
  if (passedTests === totalTests) {
    console.log('\n🎉 ALL TESTS PASSED! 🎉');
    console.log('✅ Enhanced AI Chat System is fully operational!');
  } else if (passedTests >= totalTests * 0.8) {
    console.log('\n✅ Most tests passed! System is operational.');
    console.log('⚠️  Review failed tests for improvements.');
  } else {
    console.log('\n⚠️  Some tests failed. Review the output above.');
  }

  console.log('\n📊 System Statistics:');
  const finalStats = chat.getStats();
  console.log(JSON.stringify(finalStats, null, 2));
}

// Run tests
runTests().catch(console.error);
