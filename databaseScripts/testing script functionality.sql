

-- testing database functionality with joins & simple queries


/*
SELECT * FROM Medications WHERE EndDate < GETDATE();
*/

/* 
DECLARE @UserID INT = 3;  --you would have to put the actual ID
SELECT * 
FROM Messages 
WHERE ReceiverID = @UserID 
  AND IsRead = 0;
*/



/* 
SELECT * 
FROM Messages 
WHERE ReceiverID = 3 
  AND IsRead = 0;
*/


/*  finds most active users by action - good for monitoring/ sec purposes - single capitals are just a shortcut for the name of the table M = Medications etc..
SELECT 
    U.UserID,
    U.FirstName + ' ' + U.LastName AS FullName,
    ISNULL(M.TotalMessages, 0) AS TotalMessages,
    ISNULL(L.TotalLogs, 0) AS TotalLogs,
    ISNULL(A.TotalAppointments, 0) AS TotalAppointments,
    (ISNULL(M.TotalMessages, 0) + ISNULL(L.TotalLogs, 0) + ISNULL(A.TotalAppointments, 0)) AS TotalActions
FROM Users U
LEFT JOIN (
    SELECT SenderID, COUNT(*) AS TotalMessages
    FROM Messages
    GROUP BY SenderID
) M ON U.UserID = M.SenderID
LEFT JOIN (
    SELECT UserID, COUNT(*) AS TotalLogs
    FROM AuditLog
    GROUP BY UserID
) L ON U.UserID = L.UserID
LEFT JOIN (
    SELECT CaregiverID, COUNT(*) AS TotalAppointments
    FROM Appointments
    GROUP BY CaregiverID
) A ON U.UserID = A.CaregiverID
ORDER BY TotalActions DESC
OFFSET 0 ROWS FETCH NEXT 5 ROWS ONLY;
*/
