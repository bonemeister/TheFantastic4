/*CREATE TABLE Users (
    UserID INT IDENTITY(1,1) PRIMARY KEY,
    FirstName NVARCHAR(50) NOT NULL,
    LastName NVARCHAR(50) NOT NULL,
    Email NVARCHAR(100) UNIQUE NOT NULL,
    DateOfBirth DATE,
    CreatedAt DATETIME DEFAULT GETDATE()
);
GO
*/
/*INSERT INTO Users (FirstName, LastName, Email, DateOfBirth)
VALUES ('Chris', 'Phillips', 'cphil6@example.com', '2003-06-17');
*/
Select * FROM users;


