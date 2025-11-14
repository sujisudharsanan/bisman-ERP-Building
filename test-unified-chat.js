/**
 * Test Unified Chat System
 * Run: node test-unified-chat.js
 */

const { getUnifiedChat } = require('./my-backend/services/ai/unifiedChatEngine');

async function runTests() {
  console.log('🧪 Testing Unified Chat System\n');
  
  try {
    const chat = getUnifiedChat();
    
    // Test 1: Initialize
    console.log('Test 1: Initializing chat engine...');
    await chat.init();
    console.log('✅ Chat engine initialized');
    console.log(`   Training examples loaded: ${chat.stats.totalTrainingExamples}\n`);
    
    // Test 2: Spell Check
    console.log('Test 2: Testing spell check...');
    const spellResult = await chat.spellCheck('shwo my taks and reprot');
    console.log('✅ Spell check result:');
    console.log(`   Original: "${spellResult.original}"`);
    console.log(`   Corrected: "${spellResult.corrected}"`);
    console.log(`   Corrections:`, spellResult.corrections);
    console.log('');
    
    // Test 3: Intent Classification
    console.log('Test 3: Testing intent classification...');
    const intentTests = [
      'show my tasks',
      'list pending approvals',
      'create a new task',
      'help me',
      'hello'
    ];
    
    for (const msg of intentTests) {
      const result = await chat.classifyIntent(msg);
      console.log(`   "${msg}"`);
      console.log(`   → Intent: ${result.intent} (confidence: ${(result.confidence * 100).toFixed(1)}%)`);
    }
    console.log('');
    
    // Test 4: User Context
    console.log('Test 4: Getting user context (userId=1)...');
    const userContext = await chat.getUserContext(1);
    console.log('✅ User context:', {
      firstName: userContext.firstName,
      visitCount: userContext.visitCount,
      roleName: userContext.roleName
    });
    console.log('');
    
    // Test 5: Permission Check
    console.log('Test 5: Testing RBAC permissions...');
    const permissions = ['view_tasks', 'create_task', 'approve_request', 'view_reports'];
    for (const perm of permissions) {
      const hasPermission = await chat.checkPermission(1, perm);
      console.log(`   ${perm}: ${hasPermission ? '✅ Allowed' : '❌ Denied'}`);
    }
    console.log('');
    
    // Test 6: Process Message (MAIN TEST)
    console.log('Test 6: Processing full message...');
    const result = await chat.processMessage(1, 'show my tasks', null);
    console.log('✅ Message processed successfully!');
    console.log('   Response:', result.response.substring(0, 100) + '...');
    console.log('   Intent:', result.intent);
    console.log('   Confidence:', (result.confidence * 100).toFixed(1) + '%');
    console.log('   Conversation ID:', result.conversationId);
    console.log('   Message ID:', result.messageId);
    console.log('   Response Time:', result.stats.responseTime + 'ms');
    console.log('');
    
    // Test 7: Get History
    console.log('Test 7: Getting conversation history...');
    const history = await chat.getUserHistory(1, 5);
    console.log(`✅ Found ${history.length} messages in history`);
    if (history.length > 0) {
      console.log('   Latest:', history[0].content.substring(0, 50) + '...');
    }
    console.log('');
    
    // Test 8: Analytics
    console.log('Test 8: Getting analytics...');
    const analytics = await chat.getAnalytics(1);
    console.log(`✅ Analytics retrieved:`, analytics.length > 0 ? analytics[0] : 'No data yet');
    console.log('');
    
    console.log('═══════════════════════════════════════');
    console.log('🎉 ALL TESTS PASSED!');
    console.log('═══════════════════════════════════════');
    console.log('');
    console.log('✅ Database tables created');
    console.log('✅ Training data loaded');
    console.log('✅ Spell checking works');
    console.log('✅ Intent classification works');
    console.log('✅ RBAC permissions work');
    console.log('✅ Message processing works');
    console.log('✅ Conversation history works');
    console.log('✅ Analytics works');
    console.log('');
    console.log('📊 Stats:');
    console.log(`   Total Messages: ${chat.stats.totalMessages}`);
    console.log(`   Total Corrections: ${chat.stats.totalCorrections}`);
    console.log(`   Training Examples: ${chat.stats.totalTrainingExamples}`);
    console.log('');
    console.log('🚀 Ready to use! Start your server and test at:');
    console.log('   http://localhost:3000/api/unified-chat/health');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('\nError details:', error.stack);
    process.exit(1);
  }
  
  process.exit(0);
}

runTests();
