export function getUserIdentity(user) {
  if (!user) return { userId: '', userEmail: '' };
  
  const userId = user.id || user.user_id || user._id || '';
  const userEmail = user.email || user.emailAddress || user.primary_email || '';
  
  return { userId, userEmail };
}