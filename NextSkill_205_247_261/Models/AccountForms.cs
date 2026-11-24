using System.ComponentModel.DataAnnotations;

namespace NextSkill_205_247_261.Models;

public class LoginForm
{
    [StringLength(2048, ErrorMessage = "ลิงก์กลับหน้ายาวเกินที่ระบบรองรับ")]
    public string? ReturnUrl { get; set; }
    [Required(ErrorMessage = "กรุณากรอกอีเมล")]
    [EmailAddress(ErrorMessage = "กรุณากรอกอีเมลให้ถูกต้อง")]
    [StringLength(RegisterForm.EmailMaximumLength, ErrorMessage = "อีเมลต้องยาวไม่เกิน {1} ตัวอักษร")]
    public string Email { get; set; } = "";
    [Required(ErrorMessage = "กรุณากรอกรหัสผ่าน")]
    [StringLength(RegisterForm.PasswordMaximumLength, ErrorMessage = "รหัสผ่านต้องยาวไม่เกิน {1} ตัวอักษร")]
    [DataType(DataType.Password)]
    public string Password { get; set; } = "";
    public bool RememberMe { get; set; }
}

public class RegisterForm
{
    public const int NameMinimumLength = 2;
    public const int NameMaximumLength = 100;
    public const int EmailMaximumLength = 254;
    public const int PasswordMinimumLength = 8;
    public const int PasswordMaximumLength = 128;
    public const int InvitationMaximumLength = 128;

    [StringLength(2048, ErrorMessage = "ลิงก์กลับหน้ายาวเกินที่ระบบรองรับ")]
    public string? ReturnUrl { get; set; }
    [Required(ErrorMessage = "กรุณากรอกชื่อที่แสดง")]
    [StringLength(NameMaximumLength, MinimumLength = NameMinimumLength, ErrorMessage = "ชื่อที่แสดงต้องมี {2}–{1} ตัวอักษร")]
    [RegularExpression(@".*\S.*", ErrorMessage = "กรุณากรอกชื่อที่แสดง")]
    public string FullName { get; set; } = "";
    [Required(ErrorMessage = "กรุณากรอกอีเมล")]
    [EmailAddress(ErrorMessage = "กรุณากรอกอีเมลให้ถูกต้อง")]
    [StringLength(EmailMaximumLength, ErrorMessage = "อีเมลต้องยาวไม่เกิน {1} ตัวอักษร")]
    public string Email { get; set; } = "";
    [Required(ErrorMessage = "กรุณาตั้งรหัสผ่าน")]
    [StringLength(PasswordMaximumLength, MinimumLength = PasswordMinimumLength, ErrorMessage = "รหัสผ่านต้องมี {2}–{1} ตัวอักษร")]
    [DataType(DataType.Password)]
    public string Password { get; set; } = "";
    [Required(ErrorMessage = "กรุณากรอกรหัสผ่านอีกครั้ง")]
    [Compare(nameof(Password), ErrorMessage = "รหัสผ่านทั้งสองช่องไม่ตรงกัน")]
    [DataType(DataType.Password)]
    public string ConfirmPassword { get; set; } = "";
    [Range(typeof(bool), "true", "true", ErrorMessage = "กรุณายอมรับเงื่อนไขการใช้งานและนโยบายความเป็นส่วนตัว")]
    public bool AcceptTerms { get; set; }
    [StringLength(InvitationMaximumLength, ErrorMessage = "รหัสเชิญยาวเกินที่ระบบรองรับ")]
    public string? InvitationCode { get; set; }
}

public sealed class ProfileEditForm
{
    [Required(ErrorMessage = "กรุณากรอกชื่อที่แสดง")]
    [StringLength(RegisterForm.NameMaximumLength, MinimumLength = RegisterForm.NameMinimumLength,
        ErrorMessage = "ชื่อที่แสดงต้องมี {2}–{1} ตัวอักษร")]
    public string FullName { get; set; } = "";

    [Required(ErrorMessage = "กรุณากรอกอีเมล")]
    [EmailAddress(ErrorMessage = "กรุณากรอกอีเมลให้ถูกต้อง")]
    [StringLength(RegisterForm.EmailMaximumLength, ErrorMessage = "อีเมลต้องยาวไม่เกิน {1} ตัวอักษร")]
    public string Email { get; set; } = "";

    [StringLength(RegisterForm.PasswordMaximumLength, ErrorMessage = "รหัสผ่านต้องยาวไม่เกิน {1} ตัวอักษร")]
    public string? CurrentPassword { get; set; }
}
