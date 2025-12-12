// MongoDB Migration Script: Append " :)" to existing user names if not present

(function () {
  // Use default database or switch as required
  print("Running migration: Append ' :)' to db.user.name if not already appended.");

  // Helper: Get all users whose name does not already end with " :)"
  const usersToUpdate = db.user.find({ name: { $not: / \:\)$/ } });

  let modifiedCount = 0;
  usersToUpdate.forEach((user) => {
    const newName = `${user.name  } :)`;
    db.user.updateOne(
      { _id: user._id },
      { $set: { name: newName } }
    );
    modifiedCount++;
  });

  print(`Migration complete. Modified ${modifiedCount} user(s).`);
})();

