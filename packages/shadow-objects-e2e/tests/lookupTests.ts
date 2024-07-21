import {expect, test} from '@playwright/test';

export const lookupTestResult = (testId: string) => {
  test(testId, async ({page}) => {
    await expect(page.getByTestId(testId)).toHaveAttribute('data-testresult', 'ok');
  });
};

export const lookupTests = (testIds: string[]) => testIds.forEach(lookupTestResult);
