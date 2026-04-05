@echo off
echo Cleaning up unnecessary files...
echo.

cd /d "c:\Users\aliba\Deen-Learning\test-react-app"

echo Deleting root documentation files...
del /F /Q "BEFORE_AFTER_COMPARISON.md" 2>nul
del /F /Q "competitive-analysis.html" 2>nul
del /F /Q "COURSECARD_CHEATSHEET.js" 2>nul
del /F /Q "COURSECARD_IMPROVEMENTS.md" 2>nul
del /F /Q "COURSECARD_INDEX.js" 2>nul
del /F /Q "COURSECARD_INTEGRATION.md" 2>nul
del /F /Q "COURSECARD_SUMMARY.md" 2>nul
del /F /Q "DATABASE_INTEGRATION.md" 2>nul
del /F /Q "ENV_FIX_ACTION_GUIDE.md" 2>nul
del /F /Q "ENV_QUICK_FIX.md" 2>nul
del /F /Q "EXAMPLE_COMPLETE.md" 2>nul
del /F /Q "INSTALL_SUPABASE.md" 2>nul
del /F /Q "INTEGRATION_COMPLETE.txt" 2>nul
del /F /Q "INTEGRATION_EXAMPLE.md" 2>nul
del /F /Q "QUICK_SETUP.md" 2>nul
del /F /Q "README_COURSECARD.md" 2>nul
del /F /Q "START_HERE.txt" 2>nul
del /F /Q "SUPABASE_ENV_FIX.md" 2>nul

echo Deleting component example files...
del /F /Q "src\components\CourseCardExample.jsx" 2>nul
del /F /Q "src\components\CoursesShowcase.jsx" 2>nul
del /F /Q "src\components\PathCardExample.jsx" 2>nul
del /F /Q "src\components\COURSECARD_README.md" 2>nul
del /F /Q "src\components\PATHCARD_README.md" 2>nul

echo Deleting research folder...
if exist "research" rmdir /S /Q "research" 2>nul

echo.
echo Cleanup complete!
echo.
echo Now running git commands...
git add .
echo.
echo Git status:
git status
echo.
pause
