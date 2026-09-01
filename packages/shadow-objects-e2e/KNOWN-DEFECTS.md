# Known defects

Framework defects that this E2E suite reproduces. Currently there is none.

The mechanism for the next one: write tests that assert the **correct** behaviour and register
their ids in the spec's `knownFailures`, so they run as expected failures. The suite stays green
while the defect exists and turns red the moment it is fixed — which is the reminder to delete the
entry here and in the spec.
