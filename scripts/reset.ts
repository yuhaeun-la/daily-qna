import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc, writeBatch } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyD0hCaRoalN_7JG6y0nfqEnpF2OaoeQCY4",
  authDomain: "daily-bbb4c.firebaseapp.com",
  projectId: "daily-bbb4c",
  storageBucket: "daily-bbb4c.firebasestorage.app",
  messagingSenderId: "803433585221",
  appId: "1:803433585221:web:706b6b7e8e2cedce27a12c"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function deleteCollection(collectionPath: string) {
  const snapshot = await getDocs(collection(db, collectionPath));

  if (snapshot.empty) {
    console.log(`  ✓ ${collectionPath} 비어있음`);
    return;
  }

  const batch = writeBatch(db);
  snapshot.docs.forEach((document) => {
    batch.delete(document.ref);
  });

  await batch.commit();
  console.log(`  ✓ ${collectionPath} 삭제 완료 (${snapshot.size}개 문서)`);
}

async function deleteAnswerSubcollections(answerId: string) {
  // reactions 삭제
  const reactionsSnap = await getDocs(collection(db, 'answers', answerId, 'reactions'));
  for (const reactionDoc of reactionsSnap.docs) {
    await deleteDoc(reactionDoc.ref);
  }

  // comments 및 replies 삭제
  const commentsSnap = await getDocs(collection(db, 'answers', answerId, 'comments'));
  for (const commentDoc of commentsSnap.docs) {
    // replies 삭제
    const repliesSnap = await getDocs(collection(db, 'answers', answerId, 'comments', commentDoc.id, 'replies'));
    for (const replyDoc of repliesSnap.docs) {
      await deleteDoc(replyDoc.ref);
    }
    // comment 삭제
    await deleteDoc(commentDoc.ref);
  }
}

async function reset() {
  console.log('🗑️  Firestore 데이터 삭제 시작...\n');

  // todayQuestion 삭제
  try {
    await deleteDoc(doc(db, 'todayQuestion', 'current'));
    console.log('  ✓ todayQuestion/current 삭제 완료');
  } catch (e) {
    console.log('  ✓ todayQuestion/current 없음');
  }

  // answers 및 서브컬렉션 삭제
  const answersSnap = await getDocs(collection(db, 'answers'));
  console.log(`\n답변 삭제 중... (${answersSnap.size}개)`);

  for (const answerDoc of answersSnap.docs) {
    await deleteAnswerSubcollections(answerDoc.id);
    await deleteDoc(answerDoc.ref);
    console.log(`  ✓ 답변 ${answerDoc.id} 삭제 완료`);
  }

  console.log('\n✅ 모든 데이터 삭제 완료!\n');
  process.exit(0);
}

reset().catch((error) => {
  console.error('❌ 삭제 실패:', error);
  process.exit(1);
});
