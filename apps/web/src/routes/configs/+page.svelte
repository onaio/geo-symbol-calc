<script lang="ts">
	import PageHeader from '$lib/shared/components/PageHeader.svelte';
	import { createForm } from 'svelte-forms-lib';
	import ErrorMessage from './components/ErrorMessage.svelte';
	import ScheduleExplainer from './components/ScheduleExplainer.svelte';
	import {
		defaultPriorityFormValues,
		generateFilledData,
		type FormFields,
		PriorityLevel,
		configValidationSchema,
		defaultColorCodeFormValues,
		defaultPriorityErrorValues,
		defaultColorcodeErrorValue,
		getInitialValues,
		initialValues
	} from './utils';
	import {cloneDeep} from 'lodash-es';
	import { userTokenUrl } from '$lib/shared/constants';
	import { toast } from '@zerodevx/svelte-toast'
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';

	// props
	/** @type {import('./$types').PageData} */
	export let data;

    
    const isEdit = $page.url.searchParams.has('uuid');

	const preDeterminedPriorityLevels = Object.values(PriorityLevel);

	const { form, errors, handleChange, handleSubmit, isValid } = createForm({
		initialValues: getInitialValues(data.config),
		validationSchema: configValidationSchema,
		onSubmit: (values) => {
			const filled = generateFilledData(values);
			generatedJson = JSON.stringify(filled, null, 2);
			const successMessage = isEdit ? 'Edited config' : "Added new config"
			fetch('/configs', {
				method: isEdit ? 'PUT' : "POST",
				body: JSON.stringify(filled),
				headers: {
					'content-type': 'application/json'
				}
			}).then(() => {
				toast.push(successMessage)
				goto('/workflows')
			});
		}
	});

	$: generatedJson = JSON.stringify(generateFilledData($form), null, 2);

	const addPriorityLevel = () => {
		$form.symbolConfig = $form.symbolConfig.concat(cloneDeep(defaultPriorityFormValues));
		$errors.symbolConfig = $errors.symbolConfig.concat(cloneDeep(defaultPriorityErrorValues));
	};

	const removePriorityLevel = (i: number) => () => {
		$form.symbolConfig = $form.symbolConfig.filter((_, idx) => idx !== i);
		$errors.symbolConfig = $errors.symbolConfig.filter((_, idx: number) => idx !== i);
	};

	const addColorCodeConfig = (i: number) => () => {
		$form.symbolConfig[i].symbologyOnOverflow = $form.symbolConfig[i].symbologyOnOverflow.concat(
			cloneDeep(defaultColorCodeFormValues)
		);
		$errors.symbolConfig[i].symbologyOnOverflow = $errors.symbolConfig[
			i
		].symbologyOnOverflow.concat(defaultColorcodeErrorValue);
	};

	const removeColorCodeConfig =
		(priorityLevelIdx: number) => (symbologyOnOverFlowIdx: number) => () => {
			$form.symbolConfig[priorityLevelIdx].symbologyOnOverflow = $form.symbolConfig[
				priorityLevelIdx
			].symbologyOnOverflow.filter((_, idx) => idx !== symbologyOnOverFlowIdx);
			$errors.symbolConfig[priorityLevelIdx].symbologyOnOverflow = $errors.symbolConfig[
				priorityLevelIdx
			].symbologyOnOverflow.filter((_: never, idx: number) => idx !== symbologyOnOverFlowIdx);
		};
</script>

<PageHeader pageTitle="Create Symbology configs form" />
<div class="row g-3 mx-auto">
	<div class="col-sm-6 col-md-8">
		<form class="form" on:submit={handleSubmit}>
			<div class="form-group row mb-2">
				<label for="regFormId" class="col-sm-3">Registration Form Id</label>
				<div class="col-sm-9">
					<input
						type="text"
						id="regFormId"
						class="form-control"
						name={`regFormId`}
						on:change={handleChange}
						on:blur={handleChange}
						bind:value={$form.regFormId}
					/>
					<ErrorMessage {errors} name="formPair.regFormId" />
				</div>
			</div>
			<div class="form-group row mb-2">
				<label for="visitFormId" class="col-sm-3">Visit Form Id</label>
				<div class="col-sm-9">
					<input
						type="text"
						id="visitFormId"
						class="form-control"
						name={`visitFormId`}
						on:change={handleChange}
						on:blur={handleChange}
						bind:value={$form.visitFormId}
					/>
					<ErrorMessage {errors} name={`formPair.visitFormId`} />
				</div>
			</div>
			<div class="form-group row mb-2">
				<label for="baseUrl" class="col-sm-3">Api base url</label>
				<div class="col-sm-9">
					<input
						id="baseUrl"
						type="url"
						class="form-control"
						name="baseUrl"
						on:change={handleChange}
						on:blur={handleChange}
						bind:value={$form.baseUrl}
					/>
					<ErrorMessage {errors} name="baseUrl" />
				</div>
			</div>

			<div class="form-group row mb-2">
				<label for="apiToken" class="col-sm-3">Api token</label>
				<div class="col-sm-9">
					<div class="form-field-explainer">
						 You can get yours at {`${$form.baseUrl ? $form.baseUrl : "<base-api-url>"}${userTokenUrl}`}
					</div>
					<input
						id="apiToken"
						name="apiToken"
						type="text"
						disabled
						class="form-control"
						on:blur={handleChange}
						on:change={handleChange}
						bind:value={$form.apiToken}
					/>
					<ErrorMessage {errors} name="apiToken" />
				</div>
			</div>

			<div class="form-group row mb-2">
				<label for="schedule" class="col-sm-3">Schedule</label>
				<div class="form-group col-sm-9 row mb-2">
					<div>
						<ScheduleExplainer />
						<input
							id="schedule"
							name="schedule"
							type="text"
							class="form-control"
							on:blur={handleChange}
							on:change={handleChange}
							bind:value={$form.schedule}
						/>
						<ErrorMessage {errors} name="schedule" />
					</div>
				</div>
			</div>

			<div class="form-group row">
				<label for="symbol-configs" class="col-sm-3">Symbol config</label>
				<fieldset class="col-sm-9">
					{#each $form.symbolConfig as _, i}
						<div class="card mb-2">
							<div class="card-header">Add color code for single priorityLevel</div>
							<div class="card-body">
								<div class="form-group row mb-2">
									<label for="baseUrl" class="col-sm-3">Priority Level</label>
									<div class="col-sm-9">
										<select
											name={`symbolConfig[${i}].priorityLevel`}
											id={`symbolConfig[${i}].priorityLevel`}
											class="form-select"
											on:blur={handleChange}
											on:change={handleChange}
											bind:value={$form.symbolConfig[i].priorityLevel}
											>{#each preDeterminedPriorityLevels as priorityLevel}
												<option>{priorityLevel}</option>
											{/each}
										</select>
										<ErrorMessage {errors} name={`symbolConfig[${i}].priorityLevel`} />
									</div>
								</div>

								<div class="form-group row mb-2">
									<label for={`symbolConfig[${i}].frequency`} class="col-sm-3">Frequency</label>
									<div class="col-sm-9">
										<input
											name={`symbolConfig[${i}].frequency`}
											id={`symbolConfig[${i}].frequency`}
											type="number"
											min = 0
											class="form-control"
											on:blur={handleChange}
											on:change={handleChange}
											bind:value={$form.symbolConfig[i].frequency}
										/>
										<ErrorMessage {errors} name={`symbolConfig[${i}].frequency`} />
									</div>
								</div>

								<div class="form-group row">
									<label for="symbol-configs" class="col-sm-3">Color Codes:</label>
									<div id="symbol-configs" class="col-sm-9 mb-2">
										{#each $form.symbolConfig[i].symbologyOnOverflow as _, j}
											<div class="card mb-2">
												<div class="card-body ">
													<div class="row mb-2">
														<label
															class="form-label col-sm-6"
															for={`symbolConfig[${i}].symbologyOnOverflow[${j}].overFlowDays`}
															>OverFlow days</label
														>
														<div class="col-sm-6">
															<input
																type="number"
																min=0
																class="form-control"
																name={`symbolConfig[${i}].symbologyOnOverflow[${j}].overFlowDays`}
																id={`symbolConfig[${i}].symbologyOnOverflow[${j}].overFlowDays`}
																on:blur={handleChange}
																on:change={handleChange}
																bind:value={$form.symbolConfig[i].symbologyOnOverflow[j]
																	.overFlowDays}
															/>
															<ErrorMessage
																{errors}
																name={`symbolConfig[${i}].symbologyOnOverflow[${j}].overFlowDays`}
															/>
														</div>
													</div>
													<div class="row mb-2">
														<label
															for={`symbolConfig[${i}].symbologyOnOverflow[${j}].color`}
															class="form-label col-sm-6">Color</label
														>
														<div class="col-sm-6">
															<input
																type="color"
																class="form-control form-control-color"
																name={`symbolConfig[${i}].symbologyOnOverflow[${j}].color`}
																id={`symbolConfig[${i}].symbologyOnOverflow[${j}].color`}
																title="Pick color"
																on:blur={handleChange}
																on:change={handleChange}
																bind:value={$form.symbolConfig[i].symbologyOnOverflow[j].color}
															/>
															<ErrorMessage
																{errors}
																name={`symbolConfig[${i}].symbologyOnOverflow[${j}].color`}
															/>
														</div>
													</div>

													<div class="">
														{#if j === $form.symbolConfig[i].symbologyOnOverflow.length - 1}
															<button
																class="btn btn-sm btn-outline-primary"
																on:click={addColorCodeConfig(i)}>+</button
															>
														{/if}
														{#if $form.symbolConfig[i].symbologyOnOverflow.length !== 1}
															<button
																class="btn btn-sm btn-outline-danger"
																on:click={removeColorCodeConfig(i)(j)}>-</button
															>
														{/if}
													</div>
												</div>
											</div>
										{/each}
									</div>
								</div>
							</div>
							<div class="card-footer">
								{#if i === $form.symbolConfig.length - 1}
									<button
										on:click={addPriorityLevel}
										type="button"
										class="btn btn-sm btn-outline-primary">+ Add another priority level</button
									>
								{/if}
								{#if $form.symbolConfig.length !== 1}
									<button
										on:click={removePriorityLevel(i)}
										type="button"
										class="btn btn-sm btn-outline-danger">- Remove this priority level</button
									>
								{/if}
							</div>
						</div>
					{/each}
				</fieldset>
			</div>

			<div class="text-center">
				<button type="submit" class="btn btn-primary mt-3">Save configuration</button>
			</div>
		</form>
	</div>
	<aside class="col-sm-6 col-md-4">
		<pre>{JSON.stringify(generateFilledData($form), null, 2)}</pre>
		<div class="text-center">
			<button
				class="btn btn-outline-primary btn-sm"
				disabled={!isValid}
				on:click={() => {
					navigator.clipboard.writeText(generatedJson);
					toast.push('copied')
				}}>Copy Config</button
			>
		</div>
	</aside>
</div>

<style>
	form {
		border: 1px solid #e9ecef;
		border-radius: 8px;
		padding: 16px;
	}

	aside pre {
		padding: 16px;
		background-color: #e9ecef;
		border-radius: 8px;
	}
	/** TODO - repeated styling code.*/
	.form-field-explainer {
		font-size: 0.9rem;
		background-color: #e9ecef;
		border-radius: 5px;
		padding: 8px;
	}
</style>

