"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useApplications } from "@/lib/application-store";
import { toDateTimeLocal } from "@/lib/date";
import { stageDefinitions } from "@/lib/stages";
import type { Application, ApplicationInput } from "@/lib/types";
import { CloseIcon } from "./icons";

const formSchema = z.object({
  company: z.string().trim().min(1, "请输入公司名称").max(60, "公司名称不能超过 60 个字"),
  role: z.string().trim().min(1, "请输入岗位名称").max(80, "岗位名称不能超过 80 个字"),
  currentStage: z.enum([
    "wishlist", "applied", "assessment", "interview_ready", "interview_1", "interview_2",
    "final_interview", "offer", "accepted", "rejected", "rejected_resume", "rejected_assessment",
    "rejected_interview_1", "rejected_interview_2", "rejected_interview_3", "rejected_hr",
    "withdrawn", "ghosted",
  ]),
  priority: z.enum(["high", "medium", "low"]),
  appliedAt: z.string(),
  source: z.string().max(40),
  location: z.string().max(60),
  salaryRange: z.string().max(60),
  jobUrl: z.union([z.literal(""), z.url("请输入完整链接，例如 https://example.com")]),
  nextAction: z.string().max(100),
  nextActionAt: z.string(),
  notes: z.string().max(2000, "备注不能超过 2000 个字"),
});

type FormValues = z.infer<typeof formSchema>;

const blankValues: FormValues = {
  company: "",
  role: "",
  currentStage: "applied",
  priority: "medium",
  appliedAt: new Date().toISOString().slice(0, 10),
  source: "",
  location: "",
  salaryRange: "",
  jobUrl: "",
  nextAction: "",
  nextActionAt: "",
  notes: "",
};

function valuesFromApplication(application: Application): FormValues {
  return {
    company: application.company,
    role: application.role,
    currentStage: application.currentStage,
    priority: application.priority,
    appliedAt: application.appliedAt ?? "",
    source: application.source ?? "",
    location: application.location ?? "",
    salaryRange: application.salaryRange ?? "",
    jobUrl: application.jobUrl ?? "",
    nextAction: application.nextAction ?? "",
    nextActionAt: toDateTimeLocal(application.nextActionAt),
    notes: application.notes ?? "",
  };
}

export function ApplicationForm({ application, open, onClose }: { application: Application | null; open: boolean; onClose(): void }) {
  const { createApplication, updateApplication } = useApplications();
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: blankValues,
  });

  useEffect(() => {
    if (open) reset(application ? valuesFromApplication(application) : { ...blankValues, appliedAt: new Date().toISOString().slice(0, 10) });
  }, [application, open, reset]);

  if (!open) return null;

  function onSubmit(values: FormValues) {
    const input: ApplicationInput = {
      company: values.company.trim(),
      role: values.role.trim(),
      currentStage: values.currentStage,
      priority: values.priority,
      appliedAt: values.appliedAt || undefined,
      source: values.source.trim() || undefined,
      location: values.location.trim() || undefined,
      salaryRange: values.salaryRange.trim() || undefined,
      jobUrl: values.jobUrl.trim() || undefined,
      nextAction: values.nextAction.trim() || undefined,
      nextActionAt: values.nextActionAt ? new Date(values.nextActionAt).toISOString() : undefined,
      notes: values.notes.trim() || undefined,
    };
    if (application) updateApplication(application.id, input);
    else createApplication(input);
    onClose();
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="modal form-modal" role="dialog" aria-modal="true" aria-labelledby="application-form-title">
        <header className="modal-header">
          <div><p className="eyebrow">{application ? "Update application" : "New application"}</p><h2 id="application-form-title">{application ? "编辑投递" : "记录新投递"}</h2></div>
          <button className="icon-button" onClick={onClose} aria-label="关闭"><CloseIcon /></button>
        </header>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="form-body">
            <div className="form-grid two-columns">
              <Field label="公司" required error={errors.company?.message}><input autoFocus {...register("company")} placeholder="例如：字节跳动" /></Field>
              <Field label="岗位" required error={errors.role?.message}><input {...register("role")} placeholder="例如：前端工程师" /></Field>
            </div>
            <div className="form-grid three-columns">
              <Field label="当前阶段"><select {...register("currentStage")}>{stageDefinitions.map((stage) => <option key={stage.id} value={stage.id}>{stage.label}</option>)}</select></Field>
              <Field label="优先级"><select {...register("priority")}><option value="high">高优先</option><option value="medium">中优先</option><option value="low">低优先</option></select></Field>
              <Field label="投递日期"><input type="date" {...register("appliedAt")} /></Field>
            </div>
            <div className="form-divider"><span>岗位信息</span></div>
            <div className="form-grid two-columns">
              <Field label="投递渠道"><input {...register("source")} placeholder="Boss、官网、内推…" /></Field>
              <Field label="工作地点"><input {...register("location")} placeholder="上海 / 远程" /></Field>
              <Field label="薪资范围"><input {...register("salaryRange")} placeholder="20k–30k · 15薪" /></Field>
              <Field label="职位链接" error={errors.jobUrl?.message}><input type="url" {...register("jobUrl")} placeholder="https://" /></Field>
            </div>
            <div className="form-divider"><span>下一步</span></div>
            <div className="form-grid two-columns">
              <Field label="下一步行动"><input {...register("nextAction")} placeholder="准备一面 / 跟进 HR" /></Field>
              <Field label="行动时间"><input type="datetime-local" {...register("nextActionAt")} /></Field>
            </div>
            <Field label="备注" error={errors.notes?.message}><textarea rows={4} {...register("notes")} placeholder="记录 JD 重点、联系人或需要准备的内容…" /></Field>
          </div>
          <footer className="modal-footer"><button type="button" className="secondary-button" onClick={onClose}>取消</button><button className="primary-button" disabled={isSubmitting}>{application ? "保存修改" : "创建记录"}</button></footer>
        </form>
      </section>
    </div>
  );
}

function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return <label className={`field ${error ? "field-error" : ""}`}><span>{label}{required && <em>*</em>}</span>{children}{error && <small>{error}</small>}</label>;
}
